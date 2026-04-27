module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove a user from the group',
    category: 'group',
    usage: '.kick @user\n.kick <number>\n.kick (reply to user)',
    // ⭐ Reaction config
    reactions: {
        start: '🤬',
        success: '😤'
    },

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('`⟁⃝GROUP ONLY!!`');

        let target;

        // MODE 1: Reply to user's message
        const quotedSender = m.message?.extendedTextMessage?.contextInfo?.participant;
        const isReply = !!quotedSender;

        if (isReply && !args[0] && !m.mentionedJid?.length) {
            target = quotedSender;
        }
        // MODE 2: @mention
        else if (m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        }
        // MODE 3: Phone number
        else if (args[0]) {
            const number = args[0].replace(/[^0-9]/g, '');
            if (number.length < 10)
                return reply('`ⓘ INVALID FORMAT!`');
            target = number + '@s.whatsapp.net';
        }
        // ERROR
        else {
            return reply('`𓋎 MENTION OR REPLY TO A USER!`\n_☠︎︎ .kick @user_\n_☠︎︎ .kick (reply to user)_');
        }

        try {
            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');

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
                msg += '☠︎︎ _Cannot remove this user_';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};
