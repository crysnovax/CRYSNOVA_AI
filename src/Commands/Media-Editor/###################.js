const mumaker = require('mumaker');

module.exports = {
    name: 'matrix',
    alias: [],
    desc: 'Create a matrix text effect on an image',
    category: 'textmaker',
    usage: 'matrix <text>',
    // ⭐ Reaction config
    reactions: {
        start: '🎬',
        success: '👾'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *MATRIX TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .matrix <text>\n│\n│ 𓄄 Example:\n│   .matrix Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/matrix-text-effect-154.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
           //     caption: `╭─❍ *MATRIX TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[MATRIX ERROR]', err.message);

            return reply(
                `╭─❍ *MATRIX TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
