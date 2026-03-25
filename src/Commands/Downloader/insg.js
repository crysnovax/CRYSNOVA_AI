const fetch = require('node-fetch');

module.exports = {
    name: 'ing',
    alias: ['ig', 'igdl'],
    desc: 'Download Instagram videos/posts',
    category: 'Download',

    execute: async (sock, m, { args, reply, quoted }) => {
        try {
            let url = args[0] || m.quoted?.text;
            if (!url) return reply('_*✘ Provide an Instagram link*_');

            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = `https://apis.prexzyvilla.site/download/instagram?url=${encodeURIComponent(url)}`;

            const res = await fetch(apiUrl);
            if (!res.ok) return reply('✘ API failed');

            const data = await res.json();

            // handle different formats
            let media =
                data?.result?.video ||
                data?.result?.url ||
                data?.result?.download ||
                data?.url;

            if (!media) return reply('⚉ Failed to get media');

            // send video or image
            await sock.sendMessage(m.chat, {
                video: { url: media },
                caption: '📥 *Instagram Download*'
            }, { quoted: m });

        } catch (err) {
            console.error('[IG ERROR]', err);
            reply('𓉤 Failed to download Instagram media');
        }
    }
};
