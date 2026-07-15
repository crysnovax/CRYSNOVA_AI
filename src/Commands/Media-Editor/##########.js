const mumaker = require('mumaker');

module.exports = {
    name: 'impressive',
    alias: [],
    desc: 'Create a 3D colorful paint text effect',
    category: 'textmaker',
    usage: 'impressive <text>',
    reactions: {
        start: '🎨',
        success: '🖌️'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *IMPRESSIVE TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .impressive <text>\n│\n│ 𓄄 Example:\n│   .impressive Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
     //           caption: `╭─❍ *IMPRESSIVE TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[IMPRESSIVE ERROR]', err.message);

            return reply(
                `╭─❍ *IMPRESSIVE TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
