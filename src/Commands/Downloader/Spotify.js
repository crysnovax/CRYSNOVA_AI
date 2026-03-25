const fetch = require('node-fetch');

module.exports = {
    name: 'spotify',
    alias: ['sp', 'spdl'],
    desc: 'Download Spotify songs as MP3',
    category: 'Download',

    execute: async (sock, m, { args, reply, quoted }) => {
        try {
            let url = args[0] || m.quoted?.text;
            if (!url) return reply('𓄄 Provide a Spotify track link');

            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = `https://apis.prexzyvilla.site/download/spotify?url=${encodeURIComponent(url)}`;

            const res = await fetch(apiUrl);
            if (!res.ok) return reply('⚉ API failed');

            const data = await res.json();

            const audioUrl =
                data?.result?.download ||
                data?.result?.url ||
                data?.download ||
                data?.url;

            const title =
                data?.result?.title ||
                data?.title ||
                'spotify_song';

            const artist =
                data?.result?.artist ||
                data?.artist ||
                'Unknown Artist';

            const thumbnail =
                data?.result?.thumbnail ||
                data?.thumbnail;

            if (!audioUrl) return reply('✘ Failed to fetch song');

            // 🎵 Info card
            if (thumbnail) {
                await sock.sendMessage(m.chat, {
                    image: { url: thumbnail },
                    caption:
                        `🎧 *${title}*\n` +
                        `🎤 ${artist}\n\n` +
                        `_Downloading..._`
                }, { quoted: m });
            }

            // 🎵 Send audio
            await sock.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg'
            }, { quoted: m });

            // 📥 Send as file
            const safeTitle = title.replace(/[^\w\s-]/g, '').slice(0, 50);

            await sock.sendMessage(m.chat, {
                document: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`
            }, { quoted: m });

        } catch (err) {
            console.error('[SPOTIFY ERROR]', err);
            reply('❌ Failed to download Spotify track');
        }
    }
};
