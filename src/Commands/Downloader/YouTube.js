const axios = require('axios');

module.exports = {
    name: 'yt',
    alias: ['youtube', 'ytdl'],
    desc: 'Download YouTube video',
    category: 'downloader',
    usage: '.yt <YouTube URL>',

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();

        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return reply(
                '𓄄 *Provide a valid YouTube URL!*\n\n' +
                'Example:\n' +
                '`.yt https://youtu.be/xxxx`'
            );
        }

        await reply('✪ _*Downloading YouTube video...*_');

        try {

            const api = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`;
            const res = await axios.get(api, { headers: { Accept: "application/json" } });

            const data = res.data;

            const video =
                data?.videos?.["720"] ||
                data?.videos?.["480"] ||
                data?.videos?.["360"] ||
                Object.values(data?.videos || {})[0];

            if (!video) {
                return reply("✘ Failed to fetch video");
            }

            const caption =
                `🎬 *YouTube Downloader*\n\n` +
                `Title: ${data.title || "YouTube Video"}\n` +
                `✓ Download Complete`;

            await sock.sendMessage(m.chat, {
                video: { url: video },
                mimetype: "video/mp4",
                caption,
                fileName: `${data.title || "youtube"}.mp4`
            }, { quoted: m });

        } catch (err) {
            console.log(err);
            reply("✘ Error downloading video");
        }
    }
};