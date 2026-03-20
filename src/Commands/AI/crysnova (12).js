// ZEE BOT V2 — CRYSNOVA AI
// Auto replies when the bot is tagged/mentioned in a group
// Uses the same underlying API as Luna (getLunaResponse from Core/!!!.js)

const { getLunaResponse } = require('../Core/!!!.js');
const { getVar }           = require('../../Plugin/configManager');

// Per-chat memory (in-memory, resets on restart)
const chatMemory = new Map();
const MAX_MEMORY = 10;

// ── Command: .crysnova <question> ─────────────────────────────
module.exports = {
    name: 'crysnova',
    alias: ['crys', 'ai'],
    desc: 'Ask CRYSNOVA AI anything',
    category: 'AI',
    reactions: { start: '⚉', success: '✨' },

    execute: async (sock, m, { args, text, reply }) => {
        const question = text?.trim();
        if (!question) return reply('_*⚉ Ask CRYSNOVA AI something.*_\nUsage: .crysnova <your question>');

        try {
            await sock.sendMessage(m.chat, { react: { text: '⚉', key: m.key } }).catch(() => {});
            const response = await getLunaResponse(question);
            await sock.sendMessage(m.chat, {
                text: `⚉ *CRYSN⚉VA AI*\n\n${response}`
            }, { quoted: m });
        } catch {
            reply('_*✘ CRYSNOVA AI failed. Try again.*_');
        }
    }
};

// ── Auto-reply when bot is tagged ─────────────────────────────
// Called from setupMessageHandler when bot is mentioned in a group
module.exports.onMention = async (sock, m) => {
    try {
        const enabled = getVar('CRYSNOVA_AI_MENTION', true);
        if (!enabled) return;

        // Extract the actual question (remove the @mention part)
        const text = (m.text || m.body || '')
            .replace(/@\d+/g, '')
            .trim();

        if (!text || text.length < 2) return;

        // Per-chat memory
        const chatId = m.chat;
        if (!chatMemory.has(chatId)) chatMemory.set(chatId, []);
        const memory = chatMemory.get(chatId);

        // Build context-aware prompt
        const context = memory.length
            ? memory.map(x => `${x.role === 'user' ? 'User' : 'CRYSNOVA'}: ${x.content}`).join('\n') + '\nUser: ' + text
            : text;

        await sock.sendPresenceUpdate('composing', m.chat);

        const response = await getLunaResponse(context);

        if (!response?.trim()) return;

        // Save to memory
        memory.push({ role: 'user', content: text });
        memory.push({ role: 'assistant', content: response });
        if (memory.length > MAX_MEMORY * 2) memory.splice(0, memory.length - MAX_MEMORY * 2);

        await sock.sendMessage(m.chat, {
            text: `⚉ *CRYSN⚉VA AI*\n\n${response.trim()}`
        }, { quoted: m });

        await sock.sendPresenceUpdate('available', m.chat);

    } catch {
        // Silent — never send error messages on auto-reply
    }
};
