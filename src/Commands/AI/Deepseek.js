const axios = require("axios");
const config = require("../../../settings/config");

// Use gateway URL and token from config
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || config.api?.gatewayToken || '';

// Prexzy — primary for now, no key required
const PREXZY_URL = 'https://prexzyapis.com/ai/deepseekreasoner';


const IDENTITY_PREFIX = `You are Deepseek, an AI assistant powered by CRYSNOVA. You do not have a separate personal name or persona — you are simply "Deepseek, powered by CRYSNOVA." Respond helpfully and naturally to the message below, without adopting any other name or character.

User message: `;

async function askPrexzy(query) {
    const res = await axios.get(PREXZY_URL, {
        params: { prompt: IDENTITY_PREFIX + query },
        timeout: 60000
    });

    const data = res.data;

    if (data?.status && data?.response) {
        return data.response;
    }

    throw new Error('Prexzy response missing content');
}

async function askGateway(query) {
    const res = await axios.post(
        `${GATEWAY_URL}/deepseek?token=${encodeURIComponent(GATEWAY_TOKEN)}`,
        { query },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        }
    );

    const data = res.data;

    if (data?.success && data?.message?.content) {
        return data.message.content;
    }

    throw new Error('Gateway response missing content');
}

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

        await sock.sendMessage(jid, { react: { text: "🤖", key: m.key } });

        let answer = null;

        // ── PRIMARY: Prexzy ──
        try {
            answer = await askPrexzy(query);
        } catch (err) {
            console.error("Prexzy failed, falling back to gateway:", err.message);
        }

        // ── FALLBACK: Gateway ──
        if (!answer) {
            try {
                answer = await askGateway(query);
            } catch (err) {
                console.error("Gateway also failed:", err.message);
            }
        }

        if (answer) {
            await sock.sendMessage(jid, { text: answer }, { quoted: m });
            await sock.sendMessage(jid, { react: { text: "💬", key: m.key } });
        } else {
            await sock.sendMessage(jid, { react: { text: "❔", key: m.key } });
            reply("`❔ AI service error.`");
        }
    }
};
