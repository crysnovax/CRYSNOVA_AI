module.exports = {
    name: 'setdesc',
    alias: ['setgroupdesc', 'setdescription'],
    desc: 'Set group description',
    category: 'group',
    usage: '.setdesc new description',

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup)
            return reply('𓉤 ⚉ Group only');

        const newDesc = args.join(' ').trim();

        if (!newDesc)
            return reply('𓄄 ⚉ Provide new description\n✪ `.setdesc New group desc`');

        try {

            await sock.groupUpdateSubject(m.chat, newDesc);

            await reply('✓ ✪ Group description updated');

        } catch (err) {

            console.error('[SETDESC ERROR]', err?.message || err);

            let msg = '✘ ⚉ Failed to set description\n\n';

            if (err.message?.includes('admin') || err.message?.includes('permission')) {
                msg += '𓉤 Bot lacks admin permission';
            } else {
                msg += `𓉤 <${err.message || 'Unknown error'}>`;
            }

            reply(msg);
        }
    }
};