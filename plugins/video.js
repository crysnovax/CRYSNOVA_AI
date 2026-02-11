const axios = require('axios');
const yts = require('yt-search');

module.exports = {
    command: 'video',
    description: 'Quick YouTube video download',
    category: 'downloader',
    execute: async (sock, m, {
        args,
        text,
        q,
        quoted,
        mime,
        qmsg,
        isMedia,
        groupMetadata,
        groupName,
        participants,
        groupOwner,
        groupAdmins,
        isBotAdmins,
        isAdmins,
        isGroupOwner,
        isCreator,
        prefix,
        reply,
        config,
        sender
    }) => {
        try {
            if (!text) {
                return await reply(`🎥 Usage: ${prefix}video <name/url>\nEx: ${prefix}video music video`);
            }

            // Quick start reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "⚡", key: m.key } 
            });

            let videoUrl = text;
            let videoInfo = null;

            // If not URL, search YouTube
            if (!text.startsWith('http')) {
                const searchResults = await yts(text);
                if (!searchResults.videos.length) {
                    await sock.sendMessage(m.chat, { 
                        react: { text: "🔍", key: m.key } 
                    });
                    return await reply("No videos found!");
                }
                videoUrl = searchResults.videos[0].url;
                videoInfo = searchResults.videos[0];
            }

            // Quick validation
            if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "❌", key: m.key } 
                });
                return await reply("Invalid YouTube link!");
            }

            // Download reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "⬇️", key: m.key } 
            });

            // Fast API call
            const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            if (!response.data?.status) {
                await sock.sendMessage(m.chat, { 
                    react: { text: "🚫", key: m.key } 
                });
                return await reply("API error - try again");
            }

            const data = response.data;
            const title = data.title || videoInfo?.title || 'Video';
            const videoLink = data.videos["360"];

            // Quick preview
            await sock.sendMessage(m.chat, {
                text: `🎥 *${title}*\n⬇️ Downloading...`
            }, { quoted: m });

            // Send video directly
            await sock.sendMessage(m.chat, {
                video: { url: videoLink },
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                caption: `🎥 ${title}\n👑 Queen Aria`
            }, { quoted: m });

            // Done reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "✅", key: m.key } 
            });

        } catch (error) {
            console.error('Video error:', error);
            await sock.sendMessage(m.chat, { 
                react: { text: "❌", key: m.key } 
            });
            await reply("Download failed - try again");
        }
    }
};