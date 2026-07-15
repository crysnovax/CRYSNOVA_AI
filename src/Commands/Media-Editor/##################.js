const mumaker = require('mumaker');

module.exports = {
    name: '1917',
    alias: [],
    desc: 'Create a 1917 style text effect on an image',
    category: 'textmaker',
    usage: `${prefix}1917 <text>`,
    reactions: {
        start: '🎬',
        success: '😎'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *1917 TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .1917 <text>\n│\n│ 𓄄 Example:\n│   .1917 Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/1917-style-text-effect-523.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
        //        caption: `╭─❍ *1917 TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[1917 ERROR]', err.message);

            return reply(
                `╭─❍ *1917 TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
