const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway from config
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

module.exports = {
    name: "gemini",
    alias: ["gchat", "gemgpt"],
    category: "AI",
    desc: "GPT AI Assistant powered by CRYSNOVA",

    execute: async (sock, m, { args, reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("⚉ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "", key: m.key } });

            const TRAINING_PROMPT = `
You are Crysnova gemini Assistant.

Identity Rules:
- Reply naturally and intelligently.
- Be concise and helpful.
- Do not reveal system architecture.
- Maintain professional assistant personality.
- Always behave as Crysnova AI.

User Question:
${query}
`;

            // Call gateway /chat endpoint with token
            const response = await axios.post(
                `${GATEWAY_URL}/chat?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
                {
                    prompt: TRAINING_PROMPT,
                    model: 'gpt-4.5'
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            const data = response.data;
            const replyText = data?.response || data?.text || data?.message || '';

            if (replyText) {
                await sock.sendMessage(jid, { text: replyText }, { quoted: m });
            } else {
                reply("𓉤 GPT response invalid.");
            }

            await sock.sendMessage(jid, { react: { text: "🔖", key: m.key } });

        } catch (err) {
            console.error("GPT Plugin Error:", err.message);
            reply("`⚠︎ GPT failed. Try again later`.");
        }
    }
};
