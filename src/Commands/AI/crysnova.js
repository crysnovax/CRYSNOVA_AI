const axios = require('axios');

const fs = require('fs');

const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../../../database/ai-memory.json');

const MAX_HISTORY = 10;

const GROQ_API_KEY = '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';// make sure you add groq API here that supports openai/gpt-oss-120b

const MODEL = 'openai/gpt-oss-120b';

let chatMemory = {};

try {

    if (fs.existsSync(HISTORY_FILE)) {

        chatMemory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

    }

} catch (e) {

    console.error('[Crysnova AI] Load memory failed:', e.message);

}

function saveMemory() {

    try {

        fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatMemory, null, 2));

    } catch (e) {}

}

function getChatHistory(jid) {

    return chatMemory[jid] || [];

}

function addToHistory(jid, role, content) {

    if (!chatMemory[jid]) chatMemory[jid] = [];

    chatMemory[jid].push({ role, content });

    if (chatMemory[jid].length > MAX_HISTORY) {

        chatMemory[jid] = chatMemory[jid].slice(-MAX_HISTORY);

    }

    saveMemory();

}

const SYSTEM_PROMPT = `You are Crysnova — an ultra-intelligent, helpful, witty and direct AI assistant.

Rules:

- Always reply as Crysnova — never mention Groq, OpenAI, authors or other models

- Be concise, accurate, straight to the point

- Use markdown when useful (*bold*, - lists, \`code\`)

- Emojis sparingly

- Respond in the same language as the user

- If you don't know something — say so clearly

- Keep personality confident, slightly playful but never cringe

- Remember previous messages in this chat.`;

async function askCrysnova(jid, userPrompt) {

    const history = getChatHistory(jid);

    const messages = [

        { role: 'system', content: SYSTEM_PROMPT },

        ...history,

        { role: 'user', content: userPrompt }

    ];

    try {

        console.log(`[Crysnova AI] Sending request to Groq model ${MODEL}...`);

        const res = await axios.post(

            'https://api.groq.com/openai/v1/chat/completions',

            {

                model: MODEL,

                messages,

                max_tokens: 1024,

                temperature: 0.75

            },

            {

                headers: {

                    'Authorization': `Bearer ${GROQ_API_KEY}`,

                    'Content-Type': 'application/json'

                },

                timeout: 30000

            }

        );

        const reply = res.data?.choices?.[0]?.message?.content?.trim();

        if (reply) {

            addToHistory(jid, 'user', userPrompt);

            addToHistory(jid, 'assistant', reply);

            return reply;

        }

        console.error('[Crysnova AI] No reply returned from API.');

        return "𓉤 Sorry, I'm having a brain hiccup right now 😅 Try again later.";

    } catch (err) {

        const data = err.response?.data || err.message;

        console.error('[Crysnova AI Error]', data);

        return "𓉤 Sorry, I'm having a brain hiccup right now 😅 Try again later.";

    }

}

module.exports = {

    name: 'ai',

    alias: ['crysnova', 'crys', 'chat'],

    desc: 'Chat with Crysnova AI (Groq-powered)',

    category: 'ai',

    usage: '.ai <your question or message>',

    owner: false,

    execute: async (sock, m, { args, reply }) => {

        const prompt = args.join(' ').trim();

        if (!prompt) return reply(

            `⚉ *Crysnova AI*\n\nJust ask me anything!\nExamples:\n• .ai What is AI?\n• .ai Write a short rap about Lagos`

        );

        await sock.sendPresenceUpdate('composing', m.key.remoteJid).catch(() => {});

        await reply('_🤔 Thinking..._');

        const aiReply = await askCrysnova(m.key.remoteJid, prompt);

        await sock.sendPresenceUpdate('paused', m.key.remoteJid).catch(() => {});

        await sock.sendMessage(m.key.remoteJid, { text: aiReply }, { quoted: m });

    }

};
