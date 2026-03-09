const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'video',
    alias: ['ytvideo', 'ytv'],
    desc: 'Download YouTube video',
    category: 'downloader',

    execute: async (sock, m, { text, reply }) => {
        try {

            if (!text) {
                return reply("✘ Provide a video name\nExample: `.video Alan Walker Lily`");
            }

            await sock.sendMessage(m.chat, {
                react: { text: "🔎", key: m.key }
            });

            const { videos } = await yts(text);
            if (!videos.length) {
                await sock.sendMessage(m.chat, {
                    react: { text: "🙈", key: m.key }
                });
                return reply("𓄄 _*No video found*_");
            }

            const vid = videos[0];

            await sock.sendMessage(m.chat, {
                react: { text: "⬇️", key: m.key }
            });

            await sock.sendMessage(m.chat, {
                image: { url: vid.thumbnail },
                caption:
`亗 *${vid.title}*

𓄄 Duration: ${vid.timestamp}
⚉ Views: ${vid.views}
✦ Channel: ${vid.author.name}

✪ _*Downloading video...*_`
            }, { quoted: m });

            const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(vid.url)}`;
            const res = await axios.get(apiUrl, { headers: { Accept: "application/json" } });

            const data = res.data;
            const videoDownloadUrl =
    data?.videos?.["360"] ||
    data?.videos?.["720"] ||
    data?.videos?.["480"] ||
    Object.values(data?.videos || {})[0];

            if (!data?.status || !videoDownloadUrl) {
                await sock.sendMessage(m.chat, {
                    react: { text: "🤧", key: m.key }
                });
                return reply("✘ Failed to download video");
            }

            await sock.sendMessage(m.chat, {
                react: { text: "📤", key: m.key }
            });

            await sock.sendMessage(m.chat, {
                video: { url: videoDownloadUrl },
                mimetype: "video/mp4",
                caption: `🎬 ${data.title || vid.title}`
            }, { quoted: m });

            await sock.sendMessage(m.chat, {
                react: { text: "🐾", key: m.key }
            });

        } catch (err) {
            console.log(err);

            await sock.sendMessage(m.chat, {
                react: { text: "😞", key: m.key }
            });

            reply("✘ Error downloading video");
        }
    }
};