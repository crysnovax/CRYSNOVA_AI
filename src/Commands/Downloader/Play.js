const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'audio', 'ytmp3', 'music'],
    desc: 'Download & send YouTube audio (high quality mp3)',
    category: 'downloader',
    usage: '.play <song name or artist>',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) {
            return reply(
                `🎵 *CRYSNOVA MUSIC DOWNLOADER*\n\n` +
                `✘ Need song name!\n` +
                `📝 Example: ${prefix}play Assurance Davido\n\n` +
                `Your personal music downloader 🚀`
            );
        }

        try {
            // Initial reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "🎶", key: m.key } 
            });

            let processingMsg = await sock.sendMessage(m.chat, { 
                text: `🔍 _*Searching*_: "${query}"\n```✪ Please wait...```` 
            }, { quoted: m });

            const { videos } = await yts(query);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "😔", key: m.key } 
                });
                await sock.sendMessage(m.chat, { 
                    text: "✘ *No Results Found*\n\nCouldn't find any song.\n💡 Try different keywords!" 
                }, { quoted: m });
                return;
            }

            const video = videos[0];

            // Update processing message
            await sock.sendMessage(m.chat, { 
                text: `✓ *Song Found!*\n\n🎵 *${video.title}*\n⏱️ ${video.timestamp} | 👁️ ${video.views}\n\n⬇️ Downloading audio...` ,
                edit: processingMsg.key
            });

            // Downloading reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "⬇️", key: m.key } 
            });

            // Use your working API (officialhectormanuel)
            const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(video.url)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });
            const data = response.data;

            if (!data?.status || !data.audio) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "❌", key: m.key } 
                });
                return await sock.sendMessage(m.chat, { 
                    text: "✘ _*Download Failed*_\n\nThe audio service is currently unavailable.\n⚡ Try again in a few minutes!" 
                }, { quoted: m });
            }

            // Success reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "⚡", key: m.key } 
            });

            // Send audio with beautiful caption
            await sock.sendMessage(m.chat, {
                audio: { url: data.audio },
                mimetype: "audio/mpeg",
                fileName: `${data.title || video.title}.mp3`.replace(/[<>:"/\\|?*]/g, ''),
                caption: `🎵 *${data.title || video.title}*\n` +
                         `By: ${data.author || video.author?.name || 'Unknown'}\n` +
                         `Duration: ${video.timestamp}\n` +
                         `Downloaded via Crysnova AI 🚀`,
                contextInfo: {
                    externalAdReply: {
                        title: "🎧 CRYSN⚉VA MUSIC",
                        body: `Playing: ${data.title || video.title}`,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url,
                        mediaType: 1
                    }
                }
            }, { quoted: m });

            // Final success reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "✅", key: m.key } 
            });

        } catch (error) {
            console.error('Error in play command:', error);
            await sock.sendMessage(m.chat, { 
                react: { text: "💀", key: m.key } 
            });
            await reply("⚉ *Oops! Something broke*\n\n✘ An unexpected error occurred\n🔧 Our team has been notified\n💫 Try again in a few minutes");
        }
    }
};