module.exports = {
    name: 'reject',
    alias: ['rejectall', 'denyall'],
    desc: 'Reject all pending group join requests',
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
                    `╭─❍ *REJECT*\n│\n` +
                    `│ ⊘ No pending requests\n` +
                    `╰──────────────────`
                );
            }

            await reply(
                `╭─❍ *REJECT*\n│\n` +
                `│ ☘️ *Rejecting...*\n` +
                `│ ⚉ Found: ${requests.length} request(s)\n` +
                `╰──────────────────`
            );

            const jids = requests.map(r => r.jid);
            await sock.groupRequestParticipantsUpdate(m.chat, jids, 'reject');

            await sock.sendMessage(m.chat, { react: { text: '🏷️', key: m.key } });
            return reply(
                `╭─❍ *REJECT*\n│\n` +
                `│ ✓ *Done!*\n` +
                `│ 元 ${jids.length} member(s) rejected\n` +
                `╰──────────────────`
            );

        } catch (err) {
            console.error('[REJECT ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

            if (err.message?.includes('not-authorized')) {
                return reply('`—͟͟͞͞𖣘 Make me an admin first`');
            }
            return reply(`\`✘ Error: ${err.message}\``);
        }
    }
};
