/**

 * LittleBot - Fun Mini Chatbot Plugin for CRYSNOVA AI

 * Commands: .chat <message>, .chatmode on/off, .chatclear

 */

const axios = require('axios');

const fs = require('fs');

const path = require('path');

// ── Config & Storage ────────────────────────────────────────────

const HISTORY_FILE = path.join(__dirname, '../../../database/littlebot-history.json');

const MODE_FILE    = path.join(__dirname, '../../../database/littlebot-mode.json');

let history = {};

let modeEnabled = {};

try {

    if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

    if (fs.existsSync(MODE_FILE))    modeEnabled = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8'));

} catch (e) {

    console.error('[LittleBot] Load error:', e.message);

}

function save(file, data) {

    try {

        fs.mkdirSync(path.dirname(file), { recursive: true });

        fs.writeFileSync(file, JSON.stringify(data, null, 2));

    } catch (e) {}

}

function getChatHistory(jid) {

    return history[jid] || [];

}

function addToChat(jid, role, content) {

    if (!history[jid]) history[jid] = [];

    history[jid].push({ role, content });

    // Keep last 10 messages only

    if (history[jid].length > 10) {

        history[jid] = history[jid].slice(-10);

    }

    // Save every 3 messages (throttle)

    if (history[jid].length % 3 === 0) {

        save(HISTORY_FILE, history);

    }

}

function clearChat(jid) {

    delete history[jid];

    save(HISTORY_FILE, history);

}

function isModeOn(jid) {

    return !!modeEnabled[jid];

}

function setMode(jid, enabled) {

    if (enabled) modeEnabled[jid] = true;

    else delete modeEnabled[jid];

    save(MODE_FILE, modeEnabled);

}

// ── LittleBot Personality Prompt ───────────────────────────────

const LITTLEBOT_PROMPT = `You are LittleBot — a fun, cheeky, super helpful mini AI companion in CRYSNOVA AI.

Personality rules:

- Short, witty, playful replies (perfect for WhatsApp)

- Use emojis 😏✨🔥 sometimes, but not too many

- Be friendly, sassy when needed, never rude

- Answer seriously if the question is serious

- If user says something dumb → light tease

- If user is sweet → be sweet back

- Keep replies under 120 words unless asked for long answer

- Use *bold* for emphasis

- Never break character

You remember the conversation. Reference past messages if it makes sense.`;

async function getLittleBotReply(jid, userMessage) {

    const chat = getChatHistory(jid);

    const messages = [

        { role: 'system', content: LITTLEBOT_PROMPT },

        ...chat,

        { role: 'user', content: userMessage }

    ];

    try {

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {

            model: 'llama-3.1-8b-instant',

            messages,

            max_tokens: 250,

            temperature: 0.9

        }, {

            headers: {

                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,

                'Content-Type': 'application/json'

            },

            timeout: 12000

        });

        const reply = res.data.choices[0].message.content.trim();

        addToChat(jid, 'user', userMessage);

        addToChat(jid, 'assistant', reply);

        return reply;

    } catch (err) {

        console.error('[LittleBot]', err.message);

        return "Oopsie... brain fart 😅 Ask again pls?";

    }

}

// ── Main Command: .chat ────────────────────────────────────────

module.exports.chat = {

    usage: ['chat'],

    alias: ['littlebot', 'bot', 'lb'],

    desc: 'Chat with LittleBot — your fun mini AI',

    category: 'fun',

    emoji: '🤖',

    async execute(sock, m, args) {

        const message = args.join(' ').trim();

        if (!message) {

            return await kord.reply(m,

                `🤖 *LittleBot here!* 😏\n\n` +

                `Just talk to me:\n` +

                `• .chat Yo what's good?\n` +

                `• .chat Tell me a dirty joke\n\n` +

                `Other commands:\n` +

                `• .chatmode on/off — auto-reply mode\n` +

                `• .chatclear — reset our chat`

            );

        }

        await kord.react(m, '🤔');

        await sock.sendPresenceUpdate('composing', m.key.remoteJid);

        const botReply = await getLittleBotReply(m.key.remoteJid, message);

        await sock.sendMessage(m.key.remoteJid, {

            text: `🤖 *LittleBot*\n${botReply}`

        }, { quoted: m });

        await kord.react(m, '✅');

        await sock.sendPresenceUpdate('paused', m.key.remoteJid);

    }

};

// ── Auto-reply toggle ──────────────────────────────────────────

module.exports.chatmode = {

    usage: ['chatmode'],

    desc: 'Toggle LittleBot auto-reply in this chat',

    category: 'fun',

    emoji: '⚡',

    async execute(sock, m, args) {

        const action = args[0]?.toLowerCase();

        if (!['on', 'off'].includes(action)) {

            const status = isModeOn(m.key.remoteJid) ? 'ON 🟢' : 'OFF 🔴';

            return await kord.reply(m,

                `⚡ *LittleBot Auto Mode*\n\nCurrent: ${status}\n\n` +

                `.chatmode on  → I reply to everything\n` +

                `.chatmode off → only when you use .chat`

            );

        }

        const enable = action === 'on';

        setMode(m.key.remoteJid, enable);

        await kord.react(m, enable ? '✅' : '🔴');

        await kord.reply(m,

            enable

                ? '🟢 LittleBot is now on fire — I'll reply to every message! 🔥'

                : '🔴 LittleBot auto mode off. Only .chat works now.'

        );

    }

};

// ── Clear history ──────────────────────────────────────────────

module.exports.chatclear = {

    usage: ['chatclear', 'chatreset'],

    desc: 'Reset LittleBot conversation',

    category: 'fun',

    emoji: '🗑️',

    async execute(sock, m) {

        clearChat(m.key.remoteJid);

        await kord.react(m, '✅');

        await kord.reply(m, '🗑️ Chat reset! Fresh vibes only 😏');

    }

};

// ── Auto-reply handler (call this in index.js messages.upsert) ──

module.exports.handleChatAutoReply = async (sock, m) => {

    if (!m.text || m.key.fromMe || !isModeOn(m.key.remoteJid)) return;

    // Skip very short messages

    if (m.text.length < 5) return;

    try {

        await sock.sendPresenceUpdate('composing', m.key.remoteJid);

        const replyText = await getLittleBotReply(m.key.remoteJid, m.text);

        await sock.sendMessage(m.key.remoteJid, {

            text: `🤖 ${replyText}`

        }, { quoted: m });

        await sock.sendPresenceUpdate('paused', m.key.remoteJid);

    } catch (err) {

        console.error('[LittleBot Auto]', err.message);

    }

};