const axios = require("axios");

module.exports = {
    name: "imagine",
    alias: ["img", "create", "gen"],
    category: "ai",
    desc: "AI Image Generator",

    execute: async (sock, m, { args, reply }) => {

        const jid = m.key.remoteJid;

        const prompt = args.join(" ").trim();

        if (!prompt) {
            return reply(
                "🎨 Provide image prompt.\nExample:\n.imagine beautiful sunset mountain"
            );
        }

        try {

            await sock.sendMessage(jid, {
                text: "🎨 Generating image... Please wait."
            }, { quoted: m });

            /* ⭐ Prompt Enhancement */

            const enhancePrompt = (text) => {

                const qualityEnhancers = [
                    "high quality",
                    "detailed",
                    "masterpiece",
                    "best quality",
                    "ultra realistic",
                    "4k",
                    "cinematic lighting",
                    "sharp focus"
                ];

                const selected = qualityEnhancers
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);

                return text + ", " + selected.join(", ");
            };

            const finalPrompt = enhancePrompt(prompt);

            /* ⭐ API Request */

            const response = await axios.get(
                "https://api.shizo.top/ai/imagine/flux",
                {
                    params: {
                        apikey: "knightbot",
                        prompt: finalPrompt
                    },
                    responseType: "arraybuffer",
                    timeout: 60000
                }
            );

            const imageBuffer = Buffer.from(response.data);

            await sock.sendMessage(jid, {
                image: imageBuffer,
                caption: `🎨 ${prompt}`
            }, { quoted: m });

        } catch (err) {

            console.error("Imagine Plugin Error:", err.message);

            reply("❌ Image generation failed.");
        }
    }
};