const mumaker = require('mumaker');

module.exports = {
    name: 'snow',
    alias: [],
    desc: 'Create a snow 3D winter text effect',
    category: 'textmaker',
    usage: '.snow <text>',
    reactions: {
        start: '🌨️',
        success: '⛄'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *SNOW TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .snow <text>\n│\n│ 𓄄 Example:\n│   .snow Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
         //       caption: `╭─❍ *SNOW TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[SNOW ERROR]', err.message);

            return reply(
                `╭─❍ *SNOW TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
