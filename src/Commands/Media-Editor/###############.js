const mumaker = require('mumaker');

module.exports = {
    name: 'devil',
    alias: [],
    desc: 'Create a neon devil wings text effect',
    category: 'textmaker',
    usage: `${prefix}devil <text>`,
    reactions: {
        start: '😈',
        success: '🔥'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *DEVIL TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .devil <text>\n│\n│ 𓄄 Example:\n│   .devil Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
             //   caption: `╭─❍ *DEVIL TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[DEVIL ERROR]', err.message);

            return reply(
                `╭─❍ *DEVIL TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
