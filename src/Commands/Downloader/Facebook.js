const axios = require('axios');

module.exports = {
    name: 'fb',
    alias: ['facebook', 'fbdown'],
    desc: 'Download Facebook video',
    category: 'downloader',
    usage: '.fb <Facebook URL>',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();

        if (!url || !url.includes('facebook.com')) {
            return reply(
                '𓄄 *Provide a valid Facebook URL!*\n\n' +
                'Example:\n' +
                '`.fb https://facebook.com/...`'
            );
        }

        await reply('✪ _*Downloading Facebook video...*_');

        const apis = [

            // API 1
            async () => {
                const res = await axios.get(
                    `https://api.akuari.my.id/downloader/fbdown?link=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.respon?.url,
                    title: res.data?.respon?.title
                };
            },

            // API 2
            async () => {
                const res = await axios.get(
                    `https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.result?.hd || res.data?.result?.sd,
                    title: res.data?.result?.title
                };
            },

            // API 3
            async () => {
                const res = await axios.get(
                    `https://api.botcahx.live/api/dowloader/fbdown?url=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.result?.hd || res.data?.result?.sd
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
                console.log('[FB API FAILED]', err.response?.status || err.message);
            }
        }

        if (!result || !result.video) {
            return reply('✘ All APIs failed. Try again later.');
        }

        const caption =
            `📘 *Facebook Downloader*\n\n` +
            `Title: ${result.title || 'Facebook Video'}\n` +
            `Downloaded by Crysnova AI`;

        await sock.sendMessage(m.key.remoteJid, {
            video: { url: result.video },
            mimetype: 'video/mp4',
            caption,
            fileName: 'facebook-video.mp4'
        }, { quoted: m });
    }
};
