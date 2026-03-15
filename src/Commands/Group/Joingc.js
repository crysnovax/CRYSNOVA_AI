module.exports = {
    name: 'join',
    alias: ['entry', 'joingc'],
    category: 'group',
    desc: 'Join a group via link',
    usage: '.join <link> or reply to a link',
    owner: true,

    execute: async (sock, m, { args, reply }) => {

        const userName = m.pushName || "Owner";

        let link = args[0] || (m.quoted ? (m.quoted.text || m.quoted.caption) : null);

        if (!link || !link.includes('chat.whatsapp.com')) {
            return reply(`
𓉤 CRYSNOVA AI JOIN SYSTEM

✘ Invalid Link
Please provide a valid WhatsApp group link or reply to one.
`);
        }

        try {

            const code = link.split('chat.whatsapp.com/')[1].trim();

            await reply(`
𓉤 CRYSNOVA AI

_*✪ Joining Group...*_
`);

            const response = await sock.groupAcceptInvite(code);

            await reply(`
𓉤 CRYSNOVA AI JOIN SUCCESS

_*✦ Successfully Joined*_ 

ID: ${response}

Action By: ${userName}
`);

        } catch (err) {

            console.error('[JOIN ERROR]', err);

            let errorMsg = `
𓉤 CRYSNOVA AI JOIN SYSTEM

✘ Join Failed
`;

            if (err.toString().includes('401')) {
                errorMsg += `Unauthorized Access.`;
            } else if (err.toString().includes('404')) {
                errorMsg += `Invalid or Reset Link.`;
            } else if (err.toString().includes('409')) {
                errorMsg += `Already a Member.`;
            } else if (err.toString().includes('410')) {
                errorMsg += `Expired Invite Link.`;
            } else {
                errorMsg += err.message || 'Unknown Network Error';
            }

            reply(errorMsg);
        }
    }
};
