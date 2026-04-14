const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway from config with token
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: "gemini",
    alias: ["gemi", "gptg"],
    category: "AI",
    desc: "Gemini AI Chat powered by CRYSNOVA",
    reactions: {
        start: '✨',
        success: '📑'
    },

    execute: async (sock, m, { args = [], reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("ಠ_ಠ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "✨", key: m.key } });

            // Call the gateway's dedicated /gemini endpoint with token
            const response = await axios.post(
                `${GATEWAY_URL}/gemini?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
                { query },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            const data = response.data;

            if (data?.success && data?.message?.content) {
                await sock.sendMessage(jid, {
                    text: `𖣘 *GEMINI AI*\n\n${data.message.content}\n\n_⚉ CRYSNOVA Gateway_`
                }, { quoted: m });
                await sock.sendMessage(jid, { react: { text: "✓", key: m.key } });
            } else {
                reply("✘ _*Gemini response invalid*_.");
            }

        } catch (err) {
            console.error("Gemini Plugin Error:", err.message);
            reply("_*ಠ_ಠ Gemini AI service error.*_");
        }
    }
};
