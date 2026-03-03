module.exports = {
    name: 'setgpp',
    alias: ['setgrouppp', 'setppgroup'],
    desc: 'Set group profile picture (reply to image)',
    category: 'group',
    usage: '.setppgc (reply to image)',

    execute: async (sock, m, { reply }) => {

        if (!m.isGroup)
            return reply('𓉤 ⚉ Group only');

        if (!m.quoted || !m.quoted.mtype?.includes('image'))
            return reply('𓄄 ⚉ Reply to an image\n✪ `.setppgc`');

        try {

            const buffer = await m.quoted.download();

            await sock.updateProfilePicture(m.chat, buffer);

            await reply('✓ ✪ Group profile picture updated');

        } catch (err) {

            console.error('[SETPPG ERROR]', err?.message || err);

            let msg = '✘ ⚉ Failed to set pp\n\n';

            if (err.message?.includes('admin') || err.message?.includes('permission')) {
                msg += '𓉤 Bot lacks admin permission';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};