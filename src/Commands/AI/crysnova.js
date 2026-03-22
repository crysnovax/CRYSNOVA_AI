/**
 * CRYSNOVA AI V2 – Auto-reply + Manual query + Creator special handling
 */

const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '../../database/autoreply.json');

if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');

const getDB = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

const { getLunaResponse } = require('../Core/!!!.js');

// Memory per chat
const chatMemory = new Map();
const MAX_MEMORY = 10;

// Helpers
const getChatId = (m) => {
    return m.key?.remoteJid || m.chat || m.key?.chat || m.from || 'unknown';
};

const isPrivateChat = (chatId) => {
    return !chatId.includes('@g.us') && !chatId.includes('status@broadcast');
};

module.exports = {
    name: 'crysnova',
    alias: ['crys', 'ai'],
    desc: 'CRYSNOVA AI V2 – smart auto-reply & manual query',

    execute: async (sock, m, { args, reply }) => {
        const chatId = getChatId(m);
        const db = getDB();
        const isGroup = chatId.includes('@g.us');

        if (args[0]?.toLowerCase() === 'on' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) return reply('Global "on all" only in private chats.');
            db.global_force_private = true;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA GLOBAL*\n│ Auto-reply **FORCED ON** for all private chats\n│ Groups unaffected\n╰────────────────');
        }

        if (args[0]?.toLowerCase() === 'off' && args[1]?.toLowerCase() === 'all') {
            if (isGroup) return reply('Global "off all" only in private chats.');
            delete db.global_force_private;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA GLOBAL*\n│ Global force-on disabled\n│ Private chats follow per-chat settings\n╰────────────────');
        }

        if (!args[0]) {
            const perChatStatus = db[chatId] ? 'ON ✓' : 'OFF ✘';
            const globalNote = (db.global_force_private && isPrivateChat(chatId)) ? ' (global force ON)' : '';
            return reply(
                `╭─❍ *CRYSNOVA AI V2* 𓉤\n` +
                `│ Status: **\( {perChatStatus}** \){globalNote}\n` +
                `│ \n` +
                `│ Usage:\n` +
                `│   .crysnova on        → Enable here\n` +
                `│   .crysnova off       → Disable here\n` +
                `│   .crysnova on all    → Force ON all private chats\n` +
                `│   .crysnova off all   → Remove global force\n` +
                `╰────────────────`
            );
        }

        const action = args[0].toLowerCase();

        if (action === 'on') {
            db[chatId] = true;
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA AI V2* ENABLED ✓\n╰─ Auto-reply active');
        }

        if (action === 'off') {
            delete db[chatId];
            saveDB(db);
            return reply('╭─❍ *CRYSNOVA AI V2* DISABLED ✘\n╰─ Auto-reply stopped');
        }

        const question = args.join(' ').trim();
        if (!question) return;

        try {
            const response = await getLunaResponse(question);
            return reply(`⚉ *CRYSNOVA AI V2*\n\n${response.trim()}`);
        } catch (err) {
            console.error('[CRYS MANUAL ERROR]', err);
            return reply('_Failed — try again_');
        }
    },

    onMessage: async (sock, m) => {
        if (!m.message) return;

        const chatId = getChatId(m);
        if (chatId === 'unknown') return;

        const db = getDB();

        let shouldReply = false;

        if (isPrivateChat(chatId)) {
            if (db.global_force_private) shouldReply = true;
            else shouldReply = !!db[chatId];
        } else {
            shouldReply = !!db[chatId];
        }

        if (!shouldReply) return;

        // ── Extract text ────────────────────────────────────────────────────
        let fullTextRaw = '';
        let fullText = '';

        try {
            fullTextRaw = (
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption ||
                m.message?.documentMessage?.caption ||
                ''
            ).trim();

            if (!fullTextRaw) return;

            fullText = fullTextRaw.toLowerCase();

            if (fullText.includes('⚉')) return;
            if (fullText.startsWith('.')) return;

            // Specific filter for creator panel to prevent loop
            if (
                fullText.includes('crysnovax') &&
                fullText.includes('ai developer') &&
                fullText.includes('benin city') &&
                (fullText.includes('whatsapp channel') || fullText.includes('support group'))
            ) {
                return;
            }

        } catch (e) {
            return;
        }

        // ── Creator question detection ──────────────────────────────────────
        try {
            const creatorKeywords = [
                'who created', 'who made', 'who is your', 'who owns', 'who is the owner',
                'creator', 'developer', 'admin', 'founder', 'maker', 'built by',
                'your owner', 'your creator', 'crys', 'crysnova', 'who are you',
                'introduce yourself', 'about you', 'bot owner', 'who owns you',
                'who developed', 'who programmed', 'your developer',
                'crysnovax', 'who is crysnovax'
            ];

            const isCreatorQuestion = creatorKeywords.some(kw => fullText.includes(kw));

            if (isCreatorQuestion) {
                let owner = {
                    name: "crysnovax",
                    number: "2348077134210",           // fallback
                    displayNumber: "+2348077134210",
                    profilePicUrl: "https://media.crysnovax.workers.dev/d1c4273f-dbd8-4a15-a874-40087fb66eff.jpg"
                };

                try {
                    const core = require('../Core/-.js');
                    if (core?.ownerInfo) {
                        owner = {
                            ...owner,
                            ...core.ownerInfo,
                            displayNumber: core.ownerInfo.displayNumber || `+${core.ownerInfo.number}`
                        };
                    }
                } catch (e) {
                    console.error('[OWNER LOAD ERROR]', e.message);
                }

                const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${owner.name}
TEL;type=CELL;type=VOICE;waid=${owner.number}:${owner.displayNumber}
END:VCARD`.trim();
                const introText = 
`⚉ Heyy! 👋

I'm *CRYSNOVA AI V2* — your multi-core, spicy AI companion 😏

The real creator & brain behind me is:

**\( {owner.name}**  ( \){owner.displayNumber})
AI Developer • Designer • Tinkerer
Based in Benin City 🔥

He's the one who coded me from scratch and keeps upgrading me.

Want the full vibe? Check out his links:

╭───────────────
│ ⚉ *WhatsApp Channel*  
│ https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38

│ ⚉ *Support Group*  
│ https://chat.whatsapp.com/Besbj8VIle1GwxKKZv1lax

│ ⚉ *Direct Contact*  
│ https://wa.me/message/636PEVHM5BZUM1

│ ⚉ *GitHub*  
│ https://github.com/crysnovax/CRYSNOVA_AI

│ ⚉ *YouTube*  
│ https://youtube.com/@crysnovax

│ ⚉ *TikTok*  
│ https://www.tiktok.com/@crysnovax

│ ⚉ *Web Portfolio 1*  
│ https://soloist.ai/crysnova-designs

│ ⚉ *Web Portfolio 2*  
│ https://soloist.ai/crysnovadesigns
╰───────────────

Hit him up for collabs, bots, designs, or just to say hi~ 😈`;

                await sock.sendMessage(chatId, { text: introText }, { quoted: m });

                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: owner.name,
                        contacts: [{ vcard }]
                    }
                }, { quoted: m });

                if (owner.profilePicUrl) {
                    await sock.sendMessage(chatId, {
                        image: { url: owner.profilePicUrl },
                        caption: `⚉ That's ${owner.name} himself 😎`
                    }, { quoted: m }).catch(() => {});
                }

                return;
            }
        } catch (err) {
            console.error('[CRYSNOVA CREATOR HANDLER ERROR]', err?.message || err);
        }

        // ── Normal auto-reply ────────────────────────────────────────────────
        try {
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
                text: `⚉ *CRYSNOVA AI V2*\n\n${response.trim()}`
            }, { quoted: m });

            await sock.sendPresenceUpdate('available', chatId);

        } catch (err) {
            console.error('[CRYSNOVA AUTO ERROR]', err?.message || err);
        }
    }
};
