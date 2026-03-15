module.exports = {
    name: 'leave',
    alias: ['exit', 'leavegc'],
    category: 'group',
    desc: 'Leave the current group',
    owner: true,

    execute: async (sock, m, { reply }) => {

        try {

            await reply(`
𓉤 CRYSNOVA AI

_*✪ Leaving Group...*_
`);

            await sock.groupLeave(m.chat);

            await reply(`
𓉤 CRYSNOVA AI

 _*Successfully Left ✔*_
`);

        } catch (err) {

            console.error('[LEAVE ERROR]', err);

            reply(`
𓉤 CRYSNOVA AI

✘ Failed to Leave
${err.message || 'Unknown Error'}
`);
        }
    }
};