const mumaker = require('mumaker');

module.exports = {
    name: 'glitch',
    alias: [],
    desc: 'Create a digital glitch text effect',
    category: 'textmaker',
    usage: `${prefix}glitch <text>`,
    reactions: {
        start: '👾',
        success: '💾'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *GLITCH TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .glitch <text>\n│\n│ 𓄄 Example:\n│   .glitch Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
     //           caption: `╭─❍ *GLITCH TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[GLITCH ERROR]', err.message);

            return reply(
                `╭─❍ *GLITCH TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
