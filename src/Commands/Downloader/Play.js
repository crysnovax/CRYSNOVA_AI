const playdl = require('play-dl');
const axios = require('axios');

const FALLBACK_APIS = (link) => [
    `https://apiskeith.top/download/audio?url=${encodeURIComponent(link)}`,
    `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(link)}`,
    `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(link)}`,
    `https://api.akuari.my.id/downloader/youtubeaudio?link=${encodeURIComponent(link)}`
];

module.exports = {
    name: 'play',
    alias: ['music'],
    desc: 'Search and download song from YouTube',
    category: 'Download',
     // ⭐ Reaction config
    reactions: {
        start: '🔍',
        success: '🎙️'
    },
    

    execute: async (sock, m, { args, reply }) => {
        try {
            const query = args.join(' ').trim();
            if (!query) return reply('_*⚉ Usage: .play <song name or YouTube link>*_');

            await sock.sendPresenceUpdate('composing', m.chat);

            let videoUrl, title, artist, thumbnail, duration;

            const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);

            // ── SEARCH / RESOLVE ──
            if (isUrl) {
                const info = await playdl.video_info(query);
                const det = info.video_details;

                videoUrl = query;
                title = det.title || 'Unknown Title';
                artist = det.channel?.name || 'Unknown Artist';
                thumbnail = det.thumbnails?.pop()?.url || '';
                duration = det.durationRaw || '';
            } else {
                const results = await playdl.search(query, { limit: 1 });
                if (!results?.length) return reply('_*𓄄 No results found*_');

                const v = results[0];
                videoUrl = v.url;
                title = v.title || 'Unknown Title';
                artist = v.channel?.name || 'Unknown Artist';
                thumbnail = v.thumbnails?.pop()?.url || '';
                duration = v.durationRaw || '';
            }

            // ── INFO CARD ──
            await sock.sendMessage(m.chat, {
                image: { url: thumbnail || 'https://files.catbox.moe/5uli5p.jpeg' },
                caption:
                    `亗 *${title}*\n` +
                    `🎤 ${artist}\n` +
                    `𓄄  ${duration}\n\n` +
                    `_*✪ Downloading...*_`
            }, { quoted: m });

            // ── TRY STREAM FIRST ──
            let audioBuffer = null;
            try {
                const stream = await playdl.stream(videoUrl, { quality: 2 });
                const chunks = [];
                for await (const chunk of stream.stream) chunks.push(chunk);
                audioBuffer = Buffer.concat(chunks);
            } catch (e) {
                console.log('[STREAM FAILED] → using fallback APIs');
            }

            // ── FALLBACK APIs ──
            let audioUrl = null;

            if (!audioBuffer) {
                for (const api of FALLBACK_APIS(videoUrl)) {
                    try {
                        const { data } = await axios.get(api, { timeout: 20000 });

                        const link =
                            data?.result?.downloadUrl ||
                            data?.result?.url ||
                            data?.result ||
                            data?.download ||
                            data?.url ||
                            data?.link;

                        if (link) {
                            audioUrl = link;
                            break;
                        }
                    } catch {
                        continue;
                    }
                }
            }

            if (!audioBuffer && !audioUrl) {
                return reply('_*✘ All servers failed. Try again later*_');
            }

            // ── SEND AUDIO ──
            await sock.sendMessage(m.chat, {
                audio: audioBuffer || { url: audioUrl },
                mimetype: 'audio/mpeg'
            }, { quoted: m });

            // ── SEND DOCUMENT (DOWNLOADABLE) ──
            const safeTitle = title.replace(/[^\w\s-]/g, '').slice(0, 50);

            await sock.sendMessage(m.chat, {
                document: audioBuffer || { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`
            }, { quoted: m });

        } catch (err) {
            console.error('[PLAY ERROR]', err);
            reply(`❌ Failed: ${err.message}`);
        }
    }
};
