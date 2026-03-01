module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove a user from the group',
    category: 'group',
    usage: '.kick @user',

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('𓉤 ⚉ This command works only in groups');

        let target;

        if (m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        } else if (args[0]) {
            const number = args[0].replace(/[^0-9]/g, '');
            if (number.length < 10)
                return reply('✘ ⚉ Invalid number format');
            target = number + '@s.whatsapp.net';
        } else {
            return reply('𓄄 ⚉ Tag a user to remove\n✪ `.kick @user`');
        }

        try {

            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');

            await new Promise(r => setTimeout(r, 1500));

            const removedNumber = target.split('@')[0];

            await reply('✓ ✪ `Kicked successfully`');

            await sock.sendMessage(m.chat, {
                text: `✪ @${removedNumber} removed from group`,
                mentions: [target]
            });

        } catch (err) {

            console.error('[KICK ERROR]', err?.message || err);

            let msg = '✘ ⚉ Failed to remove user\n\n';

            if (err.message?.includes('admin') || err.message?.includes('permission')) {
                msg += '𓉤 Bot lacks admin permission';
            } else if (err.message?.includes('not-authorized')) {
                msg += '𓉤 Cannot remove this user';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};