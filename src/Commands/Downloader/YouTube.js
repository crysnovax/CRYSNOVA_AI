const axios = require('axios');

module.exports = {
    name: 'yt',
    alias: ['youtube', 'ytdl'],
    desc: 'Download YouTube video',
    category: 'downloader',
    usage: '.yt <YouTube URL>',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();
        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return reply(
                '𓄄 *Provide a valid YouTube URL!*\n\n' +
                'Example:\n' +
                '`.yt https://youtu.be/xxxx`\n' +
                '`.yt https://youtube.com/watch?v=xxxx`'
            );
        }

        await reply('✪ _*Downloading YouTube video...*_');

        const apis = [

            // API 1
            async () => {
                const res = await axios.get(`https://api.vevioz.com/api/button/mp4?url=${encodeURIComponent(url)}`, {
                    timeout: 45000
                });

                return {
                    video: res.request?.res?.responseUrl
                };
            },

            // API 2
            async () => {
                const res = await axios.get(`https://ytdownloader.online/yt?url=${encodeURIComponent(url)}`, {
                    timeout: 45000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                return {
                    video: res.data?.data?.downloadUrl,
                    title: res.data?.data?.title
                };
            },

            // API 3
            async () => {
                const res = await axios.get(`https://api.akuari.my.id/downloader/ytmp4?link=${encodeURIComponent(url)}`, {
                    timeout: 45000
                });

                return {
                    video: res.data?.respon?.url,
                    title: res.data?.respon?.title
                };
            }

        ];

        let result = null;

        for (const api of apis) {
            try {
                const data = await api();
                if (data?.video) {
                    result = data;
                    break;
                }
            } catch (err) {
                console.log('[YT API FAILED]', err.response?.status || err.message);
            }
        }

        if (!result || !result.video) {
            return reply('✘ All APIs failed. Try again later.');
        }

        const caption =
            `🎬 *YouTube Downloader*\n\n` +
            `Title: ${result.title || 'YouTube Video'}\n` +
            `Downloaded by Crysnova AI`;

        await sock.sendMessage(m.key.remoteJid, {
            video: { url: result.video },
            mimetype: 'video/mp4',
            caption,
            fileName: 'youtube-video.mp4'
        }, { quoted: m });
    }
};
