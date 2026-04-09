const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway URL from config (falls back to hardcoded if needed)
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway ||'';

module.exports = {
    name: "deepseek",
    alias: ["ds", "ask", "ai2"],
    category: "AI",
    desc: "Deepseek AI powered by CRYSNOVA",

    execute: async (sock, m, { args, reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("⚉ _*Please ask something*_.");
        }

        try {
            // Reaction while processing
            await sock.sendMessage(jid, {
                react: { text: "🤖", key: m.key }
            });

            // Call gateway /deepseek endpoint
            const response = await axios.post(
                `${GATEWAY_URL}/deepseek`,
                { query },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            const data = response.data;

            if (data?.success && data?.message?.content) {
                await sock.sendMessage(jid, {
                    text: data.message.content
                }, { quoted: m });
            } else {
                reply("✘ *Deepseek response failed*.");
            }

            await sock.sendMessage(jid, {
                react: { text: "💬", key: m.key }
            });

        } catch (err) {
            console.error("Deepseek Plugin Error:", err.message);
            reply("`❔ AI service error.`");
        }
    }
};
