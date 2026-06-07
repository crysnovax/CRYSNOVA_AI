module.exports = {
    name: 'approve',
    alias: ['acceptall', 'approveall'],
    desc: 'Approve all pending group join requests',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '☘️', success: '🍃', error: '❔' },

    execute: async (sock, m, { reply }) => {
        try {
            await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });

            const requests = await sock.groupRequestParticipantsList(m.chat);

            if (!requests || requests.length === 0) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply(
                    `╭─❍ *APPROVE*\n│\n` +
                    `│ ⊘ No pending requests\n` +
                    `╰──────────────────`
                );
            }

            await reply(
                `╭─❍ *APPROVE*\n│\n` +
                `│ ☘️ *Approving...*\n` +
                `│ ⚉ Found: ${requests.length} request(s)\n` +
                `╰──────────────────`
            );

            const jids = requests.map(r => r.jid);
            await sock.groupRequestParticipantsUpdate(m.chat, jids, 'approve');

            await sock.sendMessage(m.chat, { react: { text: '🏷️', key: m.key } });
            return reply(
                `╭─❍ *APPROVE*\n│\n` +
                `│ ✓ *Done!*\n` +
                `│ 元 ${jids.length} member(s) approved\n` +
                `╰──────────────────`
            );

        } catch (err) {
            console.error('[APPROVE ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

            if (err.message?.includes('not-authorized')) {
                return reply('`—͟͟͞͞𖣘 Make me an admin first`');
            }
            return reply(`\`✘ Error: ${err.message}\``);
        }
    }
};
