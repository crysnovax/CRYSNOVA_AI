/**
 * CRYSNOVA AI V2 – Auto-reply + Manual query + Creator special handling + Image Reading
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const DB = path.join(__dirname, '../../database/autoreply.json');

if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');

const getDB = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

const { getLunaResponse } = require('../Core/!!!.js');

// ── Groq API key (hard-coded as requested) ─────────────────────────────
const GROQ_API_KEY = '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';

// ── Pending image confirmation (new) ─────────────────────────────
const pendingImageAnalysis = new Map(); // chatId → { buffer, caption }

// ── Upload image → public URL ─────────────────────────
const uploadImage = async (buffer) => {
    // Try catbox.moe
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('userhash', '');
        form.append('fileToUpload', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        if (typeof res.data === 'string' && res.data.startsWith('https://'))
            return res.data.trim();
    } catch (err) {
        console.log('[UPLOAD catbox FAIL]', err.message);
    }

    // Fallback: tmpfiles.org
    try {
        const form2 = new FormData();
        form2.append('file', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        const res2 = await axios.post('https://tmpfiles.org/api/v1/upload', form2, {
            headers: form2.getHeaders(),
            timeout: 20000
        });
        const url = res2.data?.data?.url;
        if (url) return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    } catch (err) {
        console.log('[UPLOAD tmpfiles FAIL]', err.message);
    }

    throw new Error('All image upload hosts failed');
};

// ── Groq Vision ───────────────────────────────────────
const describeImage = async (imageUrl, prompt) => {
    const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: imageUrl } },
                        { type: 'text', text: prompt }
                    ]
                }
            ],
            max_tokens: 1024
        },
        {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000
        }
    );

    const text = res.data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('No response from Groq Vision');
    return text.trim();
};

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
    desc: 'CRYSNOVA AI V2 – smart auto-reply & image reading',

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

            if (!fullTextRaw && !m.message?.imageMessage && !m.message?.stickerMessage) return;

            fullText = fullTextRaw.toLowerCase();

            if (fullText.includes('⚉')) return;
            if (fullText.startsWith('.')) return;

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

                // 🔥 React to user message
                await sock.sendMessage(chatId, {
                    react: { text: '🔥', key: m.key }
                }).catch(() => {});

                let owner = {
                    name: "crysnovax",
                    number: "2348077134210",
                    displayNumber: "+2348077134210",
                    profilePicUrl: "https://files.catbox.moe/z2rqc1.jpg"
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
                } catch {}

                // ✅ vCard
                const vcard = [
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    `FN:${owner.name}`,
                    `TEL;type=CELL;type=VOICE;waid=\( {owner.number}: \){owner.displayNumber}`,
                    'END:VCARD'
                ].join('\n');

                // ✅ Clean intro text
                const introText = 
`⚉ Heyy! 👋

I'm *CRYSNOVA AI V2* — your multi-core, spicy AI companion 😏

The real creator & brain behind me is:

*\( {owner.name} ( \){owner.displayNumber})*
AI Developer • Designer • Tinkerer  
Based in Benin City 🔥

He's the one who coded me from scratch and keeps upgrading me 😈`;

                const channelJid = '120363402922206865@newsletter';
                const thumbnail = owner.profilePicUrl;

                // ✅ Image + clickable preview
                let picMsg = await sock.sendMessage(chatId, {
                    image: { url: thumbnail },
                    caption: introText + `

💬 *Support Group:*  
https://chat.whatsapp.com/Besbj8VIle1GwxKKZv1lax

🥏 *Contact Owner:*  
https://wa.me/${owner.number}

👾 *GitHub:*
https://github.com/crysnovax/CRYSNOVA_AI

📺 *YouTube:*
https://youtube.com/@crysnovax?si=Zfl2Ov79lHy4kgWD

🐾 *Tiktok:*
https://www.tiktok.com/@crysnovax?_r=1&_t=ZS-94pVSsCQUWi

🔎 *WEB 1
https://soloist.ai/crysnova-designs

✨ *WEB 2
https://soloist.ai/crysnovadesigns`,

                    contextInfo: {
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelJid,
                            newsletterName: '𝓬𝓻𝔂𝓼𝓷𝓸𝓿𝓪 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭',
                            serverMessageId: 1
                        },
                        externalAdReply: {
                            title: '✦ 𝘾𝙍𝙔𝙎𝙉⚉𝙑𝘼 𝘼𝙄',
                            body: '📢 follow channel',
                            sourceUrl: 'https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38',
                            thumbnailUrl: thumbnail,
                            mediaType: 1,
                            renderLargerThumbnail: false,
                            showAdAttribution: true
                        }
                    }

                }, { quoted: m }).catch(() => {});

                // 😎 React to image
                if (picMsg) {
                    await sock.sendMessage(chatId, {
                        react: { text: '😎', key: picMsg.key }
                    }).catch(() => {});
                }

                // ✅ Send contact card
                await sock.sendMessage(chatId, {
                    contacts: {
                        displayName: owner.name,
                        contacts: [{ vcard }]
                    }
                }, { quoted: m });

                return;
            }

        } catch (err) {
            console.error('[CRYSNOVA CREATOR HANDLER ERROR]', err?.message || err);
        }

        // ── Image confirmation system ───────────────────────────────────────
        const pending = pendingImageAnalysis.get(chatId);

        // If there's a pending image and user is confirming
        if (pending) {
            const confirmWords = ['yes', 'analyze', 'describe', 'ok', 'go', 'sure', 'do it', 'read it', 'what is this', 'analyze it'];
            if (confirmWords.some(word => fullText.includes(word))) {
                await sock.sendPresenceUpdate('composing', chatId);

                let imageUrl;
                try {
                    imageUrl = await uploadImage(pending.buffer);
                } catch {
                    pendingImageAnalysis.delete(chatId);
                    return sock.sendMessage(chatId, { text: '⚉ Failed to upload image.' }, { quoted: m });
                }

                const prompt = pending.caption || 'Describe this image in detail. Include any visible text (OCR), objects, people, colors, setting, mood, style, and context. Be accurate and concise.';

                try {
                    const description = await describeImage(imageUrl, prompt);
                    await sock.sendMessage(chatId, {
                        text: `⚉ *CRYSNOVA AI V2* analyzed:\n\n${description}\n\n_⚉ Powered by crysnovax verified_`
                    }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(chatId, { text: '⚉ Analysis failed — try again later.' }, { quoted: m });
                }

                pendingImageAnalysis.delete(chatId);
                return;
            } else {
                // User said something else → cancel pending
                pendingImageAnalysis.delete(chatId);
            }
        }

        // ── Detect new image and ask for confirmation ───────────────────────
        if (m.message?.imageMessage || m.message?.stickerMessage) {
            const imageMsg = m.message.imageMessage || m.message.stickerMessage;
            const caption = (imageMsg.caption || '').trim();

            if (caption.toLowerCase().includes('⚉') || caption.startsWith('.')) return;
            if (imageMsg.viewOnce || !imageMsg.mimetype) return;

            let buffer;
            try {
                buffer = await m.download();
            } catch (e) {
                console.error('[IMAGE DOWNLOAD FAIL]', e.message);
                return;
            }

            if (!buffer?.length) return;

            // Save image and ask for confirmation
            pendingImageAnalysis.set(chatId, { buffer, caption });

            await sock.sendMessage(chatId, {
                text: `⚉ Image detected.\n\nDo you want me to analyze this image? (yes / analyze / describe / ok)`
            }, { quoted: m });

            return;
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
