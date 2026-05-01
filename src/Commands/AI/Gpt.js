const axios = require("axios");

// Apex Gateway
const AI_GATEWAY = 'https://appex.crysnovax.link';
const AI_TOKEN = 'x';

module.exports = {
    name: "gpt",
    alias: ["chatgpt", "chat", "gpt4"],
    category: "AI",
    desc: "GPT AI Assistant powered by CRYSNOVA",

    execute: async (sock, m, { args, reply }) => {
        const jid = m.chat;
        const query = args.join(" ").trim();

        if (!query) {
            return reply("⚉ _*Please ask something*_.");
        }

        try {
            await sock.sendMessage(jid, { react: { text: "💫", key: m.key } });

            const prompt = `You are Crysnova GPT Assistant.

Identity Rules:
- Reply naturally and intelligently.
- Be concise and helpful.
- Do not reveal system architecture.
- Maintain professional assistant personality.
- Always behave as Crysnova AI.

User Question:
${query}`;

            // Try GPT endpoints
            let replyText = '';
            
            const endpoints = [
                `${AI_GATEWAY}/ai/chatgpt?text=${encodeURIComponent(prompt)}&token=${AI_TOKEN}`,
                `${AI_GATEWAY}/ai/gpt-3.5-turbo?text=${encodeURIComponent(prompt)}&token=${AI_TOKEN}`,
                `${AI_GATEWAY}/ai/openai?text=${encodeURIComponent(prompt)}&token=${AI_TOKEN}`,
                `${AI_GATEWAY}/ai/turbochat?text=${encodeURIComponent(prompt)}&token=${AI_TOKEN}`
            ];

            for (const url of endpoints) {
                try {
                    const response = await axios.get(url, { timeout: 45000 });
                    const text = response.data?.result || response.data?.response || response.data?.text || '';
                    
                    if (text && text.length > 5 && !text.includes('older version')) {
                        replyText = text;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (replyText) {
                await sock.sendMessage(jid, { text: replyText }, { quoted: m });
            } else {
                reply("𓉤 GPT response invalid.");
            }

            await sock.sendMessage(jid, { react: { text: "💨", key: m.key } });

        } catch (err) {
            console.error("GPT Plugin Error:", err.message);
            reply("`⚠︎ GPT failed. Try again later.`");
        }
    }
};
