module.exports = {
    name: 'horror',
    alias: ['scary', 'creep', 'nightmare'],
    desc: 'Generate horror AI images',
    category: 'AI',

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args.length) {
                return reply('🎭 Usage:\n.horror <prompt>\n.horror cinematic <prompt>');
            }

            let isCinematic = false;

            if (args[0].toLowerCase() === 'cinematic') {
                isCinematic = true;
                args.shift();
            }

            const basePrompt = args.join(' ').trim();
            if (!basePrompt) return reply('_*𓄄 Give a valid prompt*_');

            await sock.sendPresenceUpdate('composing', m.chat);

            const enhancedPrompt = isCinematic
                ? `${basePrompt}, cinematic horror, film grain, dramatic lighting, wide shot, 8k, ultra detailed`
                : `${basePrompt}, dark atmosphere, horror style, detailed, chilling`;

            const negative = `bright, happy, cute, cartoon, low quality, blurry`;

            const url = `https://apis.prexzyvilla.site/ai/horror?prompt=${encodeURIComponent(enhancedPrompt)}&negative_prompt=${encodeURIComponent(negative)}`;

            const res = await fetch(url);
            if (!res.ok) return reply('_*⚉ API failed to generate horror image*_');

            const buffer = Buffer.from(await res.arrayBuffer());

            await sock.sendMessage(m.chat, {
                image: buffer,
                caption: `🎭 *Horror Generated (${isCinematic ? 'CINEMATIC' : 'STANDARD'})*\n📝 ${basePrompt}\n☬ Stay spooky...`
            }, { quoted: m });

        } catch (err) {
            console.error('[HORROR ERROR]', err);
            reply('_*✘ Failed to summon nightmare*_');
        }
    }
};

