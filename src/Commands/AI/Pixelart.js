module.exports = {
    name: 'pixelart',
    alias: ['pixelai', '8bit', 'retroart'],
    desc: 'Generate pixel art AI images',
    category: 'AI',

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args.length) {
                return reply('👾 Usage:\n.pixelart <prompt>\n\nExamples:\n.pixelart cyberpunk city\n.pixelart cute cat');
            }

            const basePrompt = args.join(' ').trim();
            if (!basePrompt) return reply('_*𓄄 Give a valid prompt*_');

            await sock.sendPresenceUpdate('composing', m.chat);

            const enhancedPrompt = `${basePrompt}, pixel art, 8-bit style, retro gaming aesthetic, crisp pixels`;
            const negative = `blurry, smooth, realistic, 3d render, photorealistic, high resolution, anti-aliasing`;

            const url = `https://apis.prexzyvilla.site/ai/pixel-art?prompt=${encodeURIComponent(enhancedPrompt)}&negative_prompt=${encodeURIComponent(negative)}`;

            const res = await fetch(url);
            if (!res.ok) return reply('_*⚉ API failed to generate pixel art*_');

            const buffer = Buffer.from(await res.arrayBuffer());

            await sock.sendMessage(m.chat, {
                image: buffer,
                caption: `👾 *PIXEL ART GENERATED*\n📝 ${basePrompt}\n☬ 8-bit retro style`
            }, { quoted: m });

        } catch (err) {
            console.error('[PIXELART ERROR]', err);
            reply('_*✘ Failed to generate pixel art*_');
        }
    }
};
