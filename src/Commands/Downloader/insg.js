const axios = require('axios');

module.exports = {
    name: 'ig',
    alias: ['instagram', 'igdl', 'insta'],
    desc: 'Download Instagram video/reel',
    category: 'downloader',
    usage: '.ig <Instagram URL>',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();

        if (!url || !url.includes('instagram.com')) {
            return reply(
                '𓄄 *Provide a valid Instagram URL!*\n\n' +
                'Example:\n' +
                '`.ig https://www.instagram.com/reel/xxxx/`'
            );
        }

        await reply('✪ _*Downloading Instagram media...*_');

        const apis = [

            // API 1
            async () => {
                const res = await axios.get(
                    `https://api.akuari.my.id/downloader/igdown?link=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.respon?.url,
                    title: res.data?.respon?.caption
                };
            },

            // API 2
            async () => {
                const res = await axios.get(
                    `https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.result?.[0]?.url,
                    title: res.data?.result?.[0]?.title
                };
            },

            // API 3
            async () => {
                const res = await axios.get(
                    `https://api.botcahx.live/api/dowloader/igdl?url=${encodeURIComponent(url)}`,
                    { timeout: 45000 }
                );

                return {
                    video: res.data?.result?.[0]?.url
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
                console.log('[IG API FAILED]', err.response?.status || err.message);
            }
        }

        if (!result || !result.video) {
            return reply('✘ All APIs failed. Try again later.');
        }

        const caption =
            `📸 *Instagram Downloader*\n\n` +
            `Caption: ${result.title || 'Instagram Media'}\n` +
            `Downloaded by Crysnova AI`;

        await sock.sendMessage(m.key.remoteJid, {
            video: { url: result.video },
            mimetype: 'video/mp4',
            caption,
            fileName: 'instagram-video.mp4'
        }, { quoted: m });
    }
};
