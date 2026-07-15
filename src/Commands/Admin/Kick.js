module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove a user from the group',
    category: 'Admin',
    usage: '.kick @user\n.kick <number>\n.kick (reply to user)',
    // Enforced by the command dispatcher (crysMsg.js):
    groupOnly: true,
    adminOnly: true,
    botAdmin: false,
    // ⭐ Reaction config
    reactions: {
        start: '🤬',
        success: '😤'
    },

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('`⟁⃝GROUP ONLY!!`');

        // ── Build target list (identical parsing to promote/demote/add) ──
        let targets = [];

        // Reply to a message
        if (m.quoted?.sender) {
            targets.push(m.quoted.sender);
        }

        // @mentions
        if (m.mentionedJid?.length) {
            for (const jid of m.mentionedJid) {
                if (!targets.includes(jid)) targets.push(jid);
            }
        }

        // Phone numbers from args (only when no mention/reply target)
        if (!targets.length) {
            for (const arg of args) {
                const number = arg.replace(/[^0-9]/g, '');
                if (number.length < 7) continue;
                const jid = number + '@s.whatsapp.net';
                if (!targets.includes(jid)) targets.push(jid);
            }
        }

        if (!targets.length) {
            return reply('`𓋎 MENTION OR REPLY TO A USER!`\n_☠︎︎ .kick @user_\n_☠︎︎ .kick (reply to user)_');
        }

        const removed = [];
        const failed  = [];

        for (const jid of targets) {
            try {
                await sock.groupParticipantsUpdate(m.chat, [jid], 'remove');
                removed.push(jid);
            } catch (err) {
                console.error('[KICK ERROR]', err?.message || err);
                failed.push(jid);
            }
            await new Promise(r => setTimeout(r, 600));
        }

        // ── Report — mentions render as exactly @user ──
        const mentions = [...removed, ...failed];
        let text = '';

        if (removed.length) {
            text += `_*—͟͟͞͞𖣘 Removed from group:*_\n` +
                    removed.map(j => `✦ @${j.split('@')[0]}`).join('\n');
        }
        if (failed.length) {
            text += (removed.length ? '\n\n' : '') +
                    `_*✘ Failed to remove:*_\n` +
                    failed.map(j => `✦ @${j.split('@')[0]}`).join('\n');
        }

        await sock.sendMessage(m.chat, { text: text.trim(), mentions }, { quoted: m });
    }
};
