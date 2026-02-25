const axios = require("axios");

const GIPHY_KEY = "qnl7ssQChTdPjsKta2Ax2LMaGXz303tq";

async function fetchGifUrl(query) {
    const searchUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`;
    const { data } = await axios.get(searchUrl);

    if (!data.data.length) return null;

    const random = data.data[Math.floor(Math.random() * data.data.length)];
    return random.images.fixed_height.mp4;
}

module.exports = {
    name: "reaction",
    alias: ["hug", "slap", "kiss", "dance", "laugh", "cry"],
    category: "fun",

    execute: async (sock, m, { args, reply }) => {

        try {
            const body =
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                "";

            const prefix = "."; // change if your bot uses another prefix
            const cmd = body.slice(prefix.length).split(" ")[0].toLowerCase();

            const mentioned =
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            const senderName = m.pushName || "Someone";

            const target =
                mentioned.length > 0
                    ? `@${mentioned[0].split("@")[0]}`
                    : null;

            let caption;

            switch (cmd) {
                case "hug":
                    caption = target
                        ? `🤗 ${senderName} hugs ${target}`
                        : "🤗 Tag someone to hug!";
                    break;

                case "slap":
                    caption = target
                        ? `💥 ${senderName} slaps ${target}`
                        : "💥 Tag someone to slap!";
                    break;

                case "kiss":
                    caption = target
                        ? `😘 ${senderName} kisses ${target}`
                        : "😘 Tag someone to kiss!";
                    break;

                case "dance":
                    caption = `💃 ${senderName} is dancing!`;
                    break;

                case "laugh":
                    caption = `😂 ${senderName} is laughing!`;
                    break;

                case "cry":
                    caption = `😭 ${senderName} is crying...`;
                    break;

                default:
                    return reply("❌ Unknown reaction.");
            }

            const gifUrl = await fetchGifUrl(cmd + " anime");
            if (!gifUrl) return reply("❌ Could not fetch GIF.");

            await sock.sendMessage(
                m.key.remoteJid,
                {
                    video: { url: gifUrl },
                    gifPlayback: true,
                    caption,
                    mentions: mentioned
                },
                { quoted: m }
            );

        } catch (err) {
            console.error("Reaction Error:", err.message);
            reply("❌ Reaction failed.");
        }
    }
};