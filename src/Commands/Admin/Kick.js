module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove a user from the group',
    category: 'group',
    usage: '.kick @user',
     // ⭐ Reaction config
    reactions: {
        start: '🤬',
        success: '😤'
    },
    

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('`⟁⃝GROUP ONLY!!`');

        let target;

        if (m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        } else if (args[0]) {
            const number = args[0].replace(/[^0-9]/g, '');
            if (number.length < 10)
                return reply('`ⓘ INVALID FORMAT!`');
            target = number + '@s.whatsapp.net';
        } else {
            return reply('`𓋎 MENTION A USER!`\n_✪ .kick @user_');
        }

        try {

            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');

            await new Promise(r => setTimeout(r, 1500));

            const removedNumber = target.split('@')[0];

            await reply('_*ಥ⁠‿⁠ಥ Kicked successfully*_');

            await sock.sendMessage(m.chat, {
                text: `_*—͟͟͞͞𖣘 @${removedNumber} removed from group*_`,
                mentions: [target]
            });

        } catch (err) {

            console.error('[KICK ERROR]', err?.message || err);

            let msg = '_*✘ Failed to remove user*_\n\n';

            if (err.message?.includes('admin') || err.message?.includes('permission')) {
                msg += 'ಠ_ಠ _Bot lacks admin permission_';
            } else if (err.message?.includes('not-authorized')) {
                msg += '𓃼 _Cannot remove this user_';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};
