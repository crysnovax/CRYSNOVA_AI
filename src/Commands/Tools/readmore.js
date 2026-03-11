module.exports = {
    name: 'readmore',
    alias: ['rm', 'more'],
    category: 'tools',
    desc: 'Create WhatsApp read more text',
    usage: '.readmore text1 | text2',
     // ⭐ Reaction config
    reactions: {
        start: '📝',
        success: '✨'
    },
    

    execute: async (sock, m, { args, reply }) => {

        const text = args.join(' ');
        if (!text.includes('|')) {
            return reply(
                `╭────────────────────\n` +
                `│ 乂 *READ MORE TOOL*\n` +
                `╰────────────────────\n` +
                `Usage:\n` +
                `.readmore first text | hidden text\n\n` +
                `Example:\n` +
                `.readmore Hello | This is hidden`
            );
        }

        const [text1, text2] = text.split('|').map(v => v.trim());

        const invisible = String.fromCharCode(8206).repeat(4000);

        const message =
            `${text1}\n` +
            `${invisible}\n` +
            `${text2}`;

        await sock.sendMessage(
            m.chat,
            { text: message },
            { quoted: m }
        );
    }
};