const mumaker = require('mumaker');

module.exports = {
    name: 'leaves',
    alias: [],
    desc: 'Create a green leaves/nature text effect',
    category: 'textmaker',
    usage: 'leaves <text>',
    reactions: {
        start: '🌿',
        success: '🍃'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *LEAVES TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .leaves <text>\n│\n│ 𓄄 Example:\n│   .leaves Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
      //          caption: `╭─❍ *LEAVES TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[LEAVES ERROR]', err.message);

            return reply(
                `╭─❍ *LEAVES TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
