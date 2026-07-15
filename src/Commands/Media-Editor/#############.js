const mumaker = require('mumaker');

module.exports = {
    name: 'fire',
    alias: [],
    desc: 'Create a flame/fire text effect',
    category: 'textmaker',
    usage: 'fire <text>',
    reactions: {
        start: '🔥',
        success: '🧯'
    },

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ');

        if (!text) {
            return reply(
                `╭─❍ *FIRE TEXT*\n│\n│ ✘ Provide text\n│\n│ ⚉ Usage: .fire <text>\n│\n│ 𓄄 Example:\n│   .fire Nick\n╰──────────────────`
            );
        }

        try {
            const result = await mumaker.ephoto('https://en.ephoto360.com/flame-lettering-effect-372.html', text);

            if (!result || !result.image) {
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(m.chat, {
                image: { url: result.image },
        //        caption: `╭─❍ *FIRE TEXT*\n│\n│ ✓ Generated!\n│\n│ 𓃼 Text: ${text}\n│\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            console.error('[FIRE ERROR]', err.message);

            return reply(
                `╭─❍ *FIRE TEXT*\n│\n│ ✘ Failed to generate\n│\n│ 𓄇 ${err.message}\n╰──────────────────`
            );
        }
    }
};
