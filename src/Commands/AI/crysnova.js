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

// Memory per chat (unchanged)
const chatMemory = new Map();
const MAX_MEMORY = 10;

// Helper – normalize chat id
const getChatId = (m) => {
    return m.key?.remoteJid || m.chat || m.key?.chat || m.from || 'unknown';
};

// Is this a private chat (DM)?
const isPrivateChat = (chatId) => {
    return !chatId.includes('@g.us') && !chatId.includes('status@broadcast');
};

module.exports = {
    name: 'crysnova',
    alias: ['crys', 'ai'],
    desc: 'CRYSNOVA AI – auto-reply & manual query',

    // ── Command handler ────────────────────────────────────────────────
    execute: async (sock, m, { args, reply }) => {
        const chatId = getChatId(m);
        const db = getDB();

        const isGroup = chatId.includes('@g.us');

        // ── GLOBAL TOGGLE (only works from private chat or if you want from anywhere) ──
        if (args[0]?.toLowerCase() === 'on' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) {
                return reply('Global "on all" can only be used in private chats (DMs).');
            }
            db.global_force_private = true;
            saveDB(db);
            return reply(
                '╭─❍ *CRYSNOVA GLOBAL*\n' +
                '│ Auto-reply **FORCED ON** for **all private chats**\n' +
                '│ Groups are unaffected.\n' +
                '╰────────────────'
            );
        }

        if (args[0]?.toLowerCase() === 'off' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) {
                return reply('Global "off all" can only be used in private chats (DMs).');
            }
            delete db.global_force_private;
            saveDB(db);
            return reply(
                '╭─❍ *✦ CRYSNOVA GLOBAL*\n' +
                '│ Global force-on *disabled*\n' +
                '│ Private chats now follow per-chat settings again\n' +
                '╰────────────────'
            );
        }

        // ── NORMAL PER-CHAT TOGGLE ──────────────────────────────────────
        if (!args[0]) {
            const perChatStatus = db[chatId] ? 'ON ✓' : 'OFF ✘';
            const globalStatus = db.global_force_private && isPrivateChat(chatId) ? '(global force ON)' : '';

            return reply(
                `╭─❍ *CRYSNOVA AI* 𓉤\n` +
                `│ Status in this chat: **${perChatStatus}** ${globalStatus}\n` +
                `│ \n` +
                `│ Usage:\n` +
                `│   .crysnova on        → Enable in this chat\n` +
                `│   .crysnova off       → Disable in this chat\n` +
                `│   .crysnova on all    → Force ON for ALL private chats\n` +
                `│   .crysnova off all   → Remove global force-on\n` +
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

        // Fallback: treat as manual query
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

    // ── Auto-reply trigger ─────────────────────────────────────────────
    onMessage: async (sock, m) => {
        if (!m.message) return;

        const chatId = getChatId(m);
        if (chatId === 'unknown') return;

        const db = getDB();

        // ── Decide if auto-reply should run ─────────────────────────────
        let shouldReply = false;

        if (isPrivateChat(chatId)) {
            // Private chat: global override has highest priority
            if (db.global_force_private) {
                shouldReply = true;
            } else {
                // Otherwise respect per-chat setting
                shouldReply = !!db[chatId];
            }
        } else {
            // Group: always use per-chat setting only
            shouldReply = !!db[chatId];
        }

        if (!shouldReply) return;

        // ── Rest of auto-reply logic (unchanged) ────────────────────────
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

            if (fullText.includes('⚉')) return;
            if (fullText.startsWith('.')) return;

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
