const fetch = require("node-fetch");

module.exports = {
    name: "meme",
    alias: ["memes", "cheems"],
    category: "fun",
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '🤗'
    },
    

    execute: async (sock, m, { reply }) => {

        try {

            await sock.sendPresenceUpdate("composing", m.key.remoteJid);

            const response = await fetch(
                "https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo"
            );

            if (!response.ok) throw new Error("API Request Failed");

            const contentType = response.headers.get("content-type");

            if (!contentType || !contentType.includes("image")) {
                throw new Error("Invalid media response");
            }

            const imageBuffer = await response.buffer();

            const buttons = [
                {
                    buttonId: ".meme",
                    buttonText: { displayText: "🎭 Another Meme" },
                    type: 1
                },
                {
                    buttonId: ".joke",
                    buttonText: { displayText: "😄 Joke" },
                    type: 1
                }
            ];

            const caption = `
╭─❍ *CRYSNOVA MEME*
│
│ 🐕 Cheems Meme Loaded
│
│ Use buttons below
╰─𓄄 Powered by Crysnova
            `.trim();

            await sock.sendMessage(
                m.key.remoteJid,
                {
                    image: imageBuffer,
                    caption,
                    buttons,
                    headerType: 1
                },
                { quoted: m }
            );

            await sock.sendPresenceUpdate("paused", m.key.remoteJid);

        } catch (error) {

            console.error("Meme Command Error:", error.message);

            await reply("❌ Failed to fetch meme.");
        }
    }
};