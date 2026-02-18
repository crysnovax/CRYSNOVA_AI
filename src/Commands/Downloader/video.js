const yts = require('yt-search');
const ytdl = require('ytdl-core');

module.exports = {
    name: 'video',
    alias: ['ytmp4', 'yt', 'youtube'],
    desc: 'Download video from YouTube',
    category: 'Downloader',
    execute: async (sock, m, { text, reply, config }) => {
        if (!text) return reply('❌ Enter a video name or URL!\nExample: .video shape of you');
        await reply(config.mess.wait);
        try {
            const search = await yts(text);
            const video = search.videos[0];
            if (!video) return reply('❌ No results found!');
            await reply(`🎬 *${video.title}*\n⏱️ ${video.timestamp}\n\n⏳ Downloading...`);
            const stream = ytdl(video.url, { quality: 'highest', filter: 'videoandaudio' });
            await sock.sendMessage(m.chat, { video: stream, caption: `🎬 ${video.title}`, fileName: `${video.title}.mp4` }, { quoted: m });
        } catch (e) { await reply(`❌ Download failed!\n${e.message}`); }
    }
};
