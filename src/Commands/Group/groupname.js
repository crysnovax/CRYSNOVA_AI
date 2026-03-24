module.exports = {
    name: 'gcname',
    alias: ['setgcname'],
    desc: 'Set group name',
    category: 'group',
    usage: '.gcname to change group name note: character limit will still not be exceeded',

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('𓉤 ⚉ Group only');

        const newDesc = args.join(' ').trim();

        if (!newDesc)
            return reply('𓄄 ⚉ Provide new Name\n✪ `.gcname New group name`');

        try {

            await sock.groupUpdateSubject(m.chat, newDesc);

            await reply('_*✓ Group Name updated*_');

        } catch (err) {

            console.error('[SETDESC ERROR]', err?.message || err);

            let msg = '_*✘  Failed to set Name! make sure you did not exceed character limit.*_\n\n';

            if (err.message?.includes('admin') || err.message?.includes('permission')) {
                msg += '𓉤 Bot lacks admin permission';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};
