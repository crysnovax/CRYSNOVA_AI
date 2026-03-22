/**
 * CRYSNOVA AI – Auto-reply + Manual query
 */

const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '../../database/autoreply.json');

if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');

const getDB = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

const { getLunaResponse } = require('../Core/!!!.js');

// Memory per chat (still in-memory, that's fine)
const chatMemory = new Map();
const MAX_MEMORY = 10;

// Helper – normalize chat id
const getChatId = (m) => {
    return m.key?.remoteJid || m.chat || m.key?.chat || m.from || 'unknown';
};

module.exports = {
    name: 'crysnova',
    alias: ['crys', 'ai'],
    desc: 'CRYSNOVA AI – auto-reply & manual query',

    // ── Command handler (.crysnova / .ai / .crys) ───────────────────────
    execute: async (sock, m, { args, reply }) => {
        const chatId = getChatId(m);
        const db = getDB();

        // No argument → show usage
        if (!args[0]) {
            const status = db[chatId] ? 'ON ✓' : 'OFF ✘';
            return reply(
                `╭─❍ *CRYSNOVA AI* 𓉤\n` +
                `│ Status in this chat: **${status}**\n` +
                `│ \n` +
                `│ Usage:\n` +
                `│   .crysnova on     → Enable auto-reply\n` +
                `│   .crysnova off    → Disable auto-reply\n` +
                `│   .crysnova        → Show this help\n` +
                `╰────────────────`
            );
        }

        const action = args[0].toLowerCase();

        if (action === 'on') {
            db[chatId] = true;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA AI* ENABLED ✓\n╰─ Auto-reply active in this chat');
        }

        if (action === 'off') {
            delete db[chatId];
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA AI* DISABLED ✘\n╰─ Auto-reply stopped in this chat');
        }

        // If unknown subcommand → treat as normal query (fallback)
        const question = args.join(' ').trim();
        if (!question) return;

        try {
            const response = await getLunaResponse(question);
            return reply(`⚉ *CRYSNOVA AI*\n\n${response.trim()}`);
        } catch (err) {
            console.error('[CRYS MANUAL ERROR]', err);
            return reply('_Failed to get response — try again later_');
        }
    },

    // ── Auto-reply trigger (called from main handler) ─────────────────────
    onMessage: async (sock, m) => {
        if (!m.message) return;

        const chatId = getChatId(m);
        if (chatId === 'unknown') return;

        const db = getDB();

        // Feature is OFF for this chat → skip completely
        if (!db[chatId]) return;

        try {
            const fullTextRaw = (
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption ||
                m.message?.documentMessage?.caption ||
                ''
            ).trim();

            if (!fullTextRaw) return;

            const fullText = fullTextRaw.toLowerCase();

            // Protect against loops & commands
            if (fullText.includes('⚉')) return;
            if (fullText.startsWith('.')) return;
            // if (m.key.fromMe) return;     // ← uncomment if you want to block bot→bot

            // Remove mentions from question
            let question = fullTextRaw.replace(/@\d+(\s+|$)/g, '').trim();
            if (!question) return;

            if (!chatMemory.has(chatId)) chatMemory.set(chatId, []);
            const memory = chatMemory.get(chatId);

            const context = memory.length
                ? memory.map(x => `${x.role === 'user' ? 'User' : 'CRYSNOVA'}: ${x.content}`).join('\n') + '\nUser: ' + question
                : question;

            await sock.sendPresenceUpdate('composing', chatId);

            const response = await getLunaResponse(context);
            if (!response?.trim()) return;

            memory.push({ role: 'user', content: question });
            memory.push({ role: 'assistant', content: response.trim() });

            if (memory.length > MAX_MEMORY * 2) {
                memory.splice(0, memory.length - MAX_MEMORY * 2);
            }

            await sock.sendMessage(chatId, {
                text: `⚉ *CRYSNOVA AI*\n\n${response.trim()}`
            }, { quoted: m });

            await sock.sendPresenceUpdate('available', chatId);

        } catch (err) {
            console.error('[CRYSNOVA AUTO ERROR]', err?.message || err);
        }
    }
};
