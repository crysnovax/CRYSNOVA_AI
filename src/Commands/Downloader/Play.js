const yts = require('yt-search');
const axios = require('axios');

module.exports = {
    name: "play",
    alias: ["song", "ytplay", "music"],
    category: "media",
    desc: "Play YouTube music",

    execute: async (sock, m, { args, reply }) => {

        const jid = m.key.remoteJid;

        const query = args.join(" ").trim();

        if (!query) {

            await reply(
                "✘ _*Provide song name or YouTube link*_.\nExample:\n.play Alan Walker"
            );

            await sock.sendMessage(jid, {
                react: { text: "😥", key: m.key }
            });

            return;
        }

        try {

            /* Searching */

            await sock.sendMessage(jid, {
                react: { text: "🔎", key: m.key }
            });

            let videoUrl = query;

            if (
                !query.includes("youtube.com") &&
                !query.includes("youtu.be")
            ) {

                const search = await yts(query);

                if (!search?.videos?.length) {
                    return reply("✘ _*No song found*_.");
                }

                videoUrl = search.videos[0].url;
            }

            const searchResult = await yts(videoUrl);
            const video = searchResult.videos?.[0];

            if (!video) return reply("𓉤 _*Song info not found*_.");

            /* Show thumbnail */

            await sock.sendMessage(jid, {
                image: { url: video.thumbnail },
                caption:
                    `🎵 *${video.title}*\n\n` +
                    `♻️ Processing audio...`
            }, { quoted: m });

            await sock.sendMessage(jid, {
                react: { text: "🎙️", key: m.key }
            });

            /* Download audio */

            const apiUrl =
                "https://yt-dl.officialhectormanuel.workers.dev/?url=" +
                encodeURIComponent(video.url);

            const response = await axios.get(apiUrl, {
                timeout: 60000
            });

            const data = response.data;

            if (!data?.status || !data?.audio) {
                return reply("✘ _*Audio download failed*_.");
            }

            /* Send audio */

            await sock.sendMessage(jid, {
                audio: { url: data.audio },
                mimetype: "audio/mpeg",
                fileName: `${video.title}.mp3`
            }, { quoted: m });

            await sock.sendMessage(jid, {
                react: { text: "✨", key: m.key }
            });

        } catch (err) {

            console.error("Play Plugin Error:", err.message);

            reply("❌ Song processing error.");
        }
    }
};
