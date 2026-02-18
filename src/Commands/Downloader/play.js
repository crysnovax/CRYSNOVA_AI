const yts = require('yt-search');
const ytdl = require('ytdl-core');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'mp3'],
    desc: 'Download music from YouTube',
    category: 'Downloader',
    execute: async (sock, m, { text, reply, config }) => {
        if (!text) return reply('❌ Enter a song name!\nExample: .play faded');
        await reply(config.mess.wait);
        try {
            const search = await yts(text);
            const video = search.videos[0];
            if (!video) return reply('❌ No results found!');
            await reply(`🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}\n👁️ ${video.views.toLocaleString()} views\n\n⏳ Downloading...`);
            const stream = ytdl(video.url, { quality: 'highestaudio', filter: 'audioonly' });
            await sock.sendMessage(m.chat, { audio: stream, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3` }, { quoted: m });
        } catch (e) { await reply(`❌ Download failed!\n${e.message}`); }
    }
};
