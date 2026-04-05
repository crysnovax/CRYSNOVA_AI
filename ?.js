/**
 * ╔══════════════════════════════════════════════════╗
 * ║   - ZEE BOT V2          ║
 * ║   CRYSNOVA AI V2 Message Routing Engine          ║
 * ╚══════════════════════════════════════════════════╝
 */

const chalk = require('chalk');
const { setupStatusHandler } = require('./src/Plugin/statusHandler');
const { getVar }             = require('./src/Plugin/configManager');

// BOTFONT IMPORTS
const styles  = require("./src/Commands/Core/'.js");
const botFont = require('./src/Commands/Bot/botfont.js');

// ────────── AUTO‑TRANSLATION IMPORTS ──────────
const { translate } = require('./src/Commands/Tools/translate-helper.js');
const { getLang }   = require('./src/Commands/Bot/botlang.js');

// Translation cache (optional, avoids repeated API calls)
const translationCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, smsg, io, config) {

    // ────────── BOTFONT + AUTO‑TRANSLATION OVERRIDE ──────────
    const originalSend = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
        try {
            if (content?.text && typeof content.text === 'string') {
                let text = content.text;

                // 1️⃣ AUTO‑TRANSLATION (if target language is set for this chat)
                const targetLang = getLang(jid);
                if (targetLang && text.trim().length > 0) {
                    const skipPatterns = ['.setlang', '.tr', 'Usage:', '╭─', '╰─'];
                    if (!skipPatterns.some(p => text.includes(p))) {
                        const cacheKey = `${text}|${targetLang}`;
                        let translatedText = translationCache.get(cacheKey);
                        if (!translatedText) {
                            try {
                                const result = await translate(text, targetLang);
                                if (result?.translated) {
                                    translatedText = result.translated;
                                    translationCache.set(cacheKey, translatedText);
                                    setTimeout(() => translationCache.delete(cacheKey), CACHE_TTL);
                                }
                            } catch (err) {
                                console.error('[TRANSLATE ERROR]', err.message);
                            }
                        }
                        if (translatedText) text = translatedText;
                    }
                }

                // 2️⃣ BOTFONT STYLING
                const font = botFont.getFont(jid);
                if (font && styles[font]) {
                    text = styles[font](text);
                }

                content.text = text;
            }
        } catch (err) {
            console.error('[SEND OVERRIDE ERROR]', err.message);
        }
        return originalSend(jid, content, options);
    };

    // Auto Status View + Like
    setupStatusHandler(sock);

    // Anti Call — reject incoming calls if enabled
    sock.ev.on('call', async (calls) => {
        try {
            const { getVar } = require('./src/Plugin/configManager');
            if (!getVar('ANTI_CALL', true)) return;

            for (const call of calls) {
                if (call.status !== 'offer') continue;
                await sock.rejectCall(call.id, call.from).catch(() => {});
                console.log(`[ANTICALL] Rejected call from ${call.from}`);
            }
        } catch {}
    });

    // VV Reaction Listener — must start at boot with store access
    try {
        const vv = require('./src/Commands/Converter/view-once.js');
        if (vv?.setup) vv.setup(sock, customStore);
    } catch {}

    // Restore mute schedules after sock is ready
    try {
        const muteCmd = require('./src/Commands/Admin/Mute.js');
        if (muteCmd?.setupMuteSchedules) muteCmd.setupMuteSchedules(sock);
    } catch {}

    // Presence tracking for listonline
    sock.ev.on('presence.update', ({ id, presences }) => {
        if (!global.onlineUsers) global.onlineUsers = new Set();
        for (const [jid, presence] of Object.entries(presences)) {
            if (['available', 'composing', 'recording'].includes(presence.lastKnownPresence)) {
                global.onlineUsers.add(jid);
            } else {
                global.onlineUsers.delete(jid);
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek || !mek.message) return;

            if (mek.key?.remoteJid === 'status@broadcast') return;

            if (mek.message.ephemeralMessage) {
                mek.message = mek.message.ephemeralMessage.message;
            }

            const m = await smsg(sock, mek, customStore);
            if (!m) return;

            // ── Auto Read ─────────────────────────────────────────────────
            if (getVar('AUTO_READ', true)) {
                await sock.readMessages([mek.key]).catch(() => {});
            }

            if (mek.key?.remoteJid && mek.key?.id) {
                customStore.messages.set(mek.key.remoteJid + ':' + mek.key.id, mek);
            }

            // Cache message for antidelete
            try {
                const antidelete = require('./src/Commands/Tools/antidelete.js');
                if (antidelete?.cacheMessage) antidelete.cacheMessage(mek);
            } catch {}

            global.crysStats.messages++;

            io.emit('new-message', {
                from: m.sender,
                chat: m.chat,
                text: m.text || '[Media]',
                isGroup: m.isGroup,
                time: Date.now()
            });

            // Invisible Tag (@everyone)
            if (m.text && m.text.startsWith('\u200E\u200E\u200E\u200E\u200E') && m.isGroup) {
                try {
                    const metadata     = await sock.groupMetadata(m.chat);
                    const participants = metadata.participants.map(p => p.id);
                    if (participants.length) {
                        await sock.sendMessage(m.chat, {
                            text: m.text.slice(2) || '\u200E',
                            mentions: participants
                        }, { quoted: m });
                    }
                } catch {}
                return;
            }

            // Mute User Check
            try {
                const mutePlugin = require('./src/Commands/Group/muteuser.js');
                if (mutePlugin?.handleMutedMessage) {
                    const wasDeleted = await mutePlugin.handleMutedMessage(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            // Mute Sticker Check
            try {
                const mutesticker = require('./src/Commands/Group/mutesticker.js');
                if (mutesticker?.handleMutedSticker) {
                    const wasDeleted = await mutesticker.handleMutedSticker(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            // Fake Typing
            try {
                const typingMode = getVar('FAKE_TYPING', 'cmd');
                if (typingMode === 'all') {
                    await sock.sendPresenceUpdate('composing', m.key.remoteJid);
                } else if (typingMode === 'cmd') {
                    const bodyCheck   = (mek.message?.conversation || mek.message?.extendedTextMessage?.text || '').trim();
                    const prefixCheck = getVar('PREFIX', '.');
                    if (bodyCheck.startsWith(prefixCheck)) {
                        await sock.sendPresenceUpdate('composing', m.key.remoteJid);
                    }
                }
            } catch {}

            // ── AFK Handler ───────────────────────────────────────────────
            try {
                const afk = require('./src/Commands/Owner/afk.js')
                if (afk?.handleAFK) await afk.handleAFK(sock, m)
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   ANTI TAG
            // ─────────────────────────────────────────────────────────────
            try {
                const antitag = require('./src/Commands/Admin/antitag.js');
                if (antitag?.handleAntiTag) await antitag.handleAntiTag(sock, m);
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   STICKER COMMAND HANDLER
            // ─────────────────────────────────────────────────────────────
            try {
                if (m.mtype === 'stickerMessage') {
                    const { stickerCmds } = require('./src/Commands/Owner/setcmd.js');
                    const stickerData = m.message?.stickerMessage;
                    const fileSha256  = stickerData?.fileSha256;
                    if (fileSha256) {
                        const hash = Buffer.isBuffer(fileSha256)
                            ? fileSha256.toString('hex')
                            : String(fileSha256);
                        if (hash && stickerCmds[hash]) {
                            const boundCmd = stickerCmds[hash];
                            console.log(`[STICKER CMD] ${m.sender.split('@')[0]} -> ${boundCmd}`);
                            m.body = `.${boundCmd}`;
                            m.text = `.${boundCmd}`;
                        }
                    }
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   OWNER MENTION HANDLER
            // ─────────────────────────────────────────────────────────────
            try {
                const { mentionConfig } = require('./src/Commands/Owner/mention.js');

                if (mentionConfig.active) {
                    const config = require('./settings/config');
                    const ownerNumber = (process.env.OWNER_NUMBER || config.owner || '').replace(/[^0-9]/g, '');

                    if (ownerNumber) {
                        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
                        const botPnJid = (sock.user?.id || '').replace(/:\d+@/, '@s.whatsapp.net');
                        const botLid   = sock.user?.lid || '';

                        const sender = (m.sender || '').replace(/:\d+@/, '@s.whatsapp.net');
                        if (sender === botPnJid) return;

                        const norm = (j) => (j || '').replace(/:\d+@/, '@').toLowerCase().trim();

                        // ─── 1. COLLECT ALL MENTIONS ───
                        const rawMsg  = mek.message || {};
                        const ctxInfo = rawMsg.extendedTextMessage?.contextInfo ||
                                        rawMsg.imageMessage?.contextInfo         ||
                                        rawMsg.videoMessage?.contextInfo         ||
                                        rawMsg.documentMessage?.contextInfo      || {};

                        const allMentions = [
                            ...(ctxInfo.mentionedJid       || []),
                            ...(m.mentionedJid             || []),
                            ...(m.msg?.contextInfo?.mentionedJid || []),
                        ];

                        const uniqueMentions = [...new Set(allMentions)].filter(Boolean);

                        // ─── 2. CHECK IF OWNER IS MENTIONED ───
                        let isMentioned = false;

                        for (const jid of uniqueMentions) {
                            const normalized = norm(jid);

                            if (normalized === norm(ownerJid) || normalized === norm(botPnJid)) {
                                isMentioned = true;
                                break;
                            }

                            if (botLid && normalized === norm(botLid)) {
                                isMentioned = true;
                                break;
                            }

                            try {
                                const decoded = sock.decodeJid(jid);
                                if (decoded && norm(decoded) === norm(ownerJid)) {
                                    isMentioned = true;
                                    break;
                                }
                            } catch {}

                            const participantAlt = ctxInfo.participantAlt || m.msg?.contextInfo?.participantAlt;
                            if (participantAlt && norm(participantAlt) === norm(ownerJid)) {
                                isMentioned = true;
                                break;
                            }
                        }

                        // ─── 3. CHECK TEXT CONTENT ───
                        const allText = [
                            rawMsg.conversation,
                            rawMsg.extendedTextMessage?.text,
                            rawMsg.imageMessage?.caption,
                            rawMsg.videoMessage?.caption,
                            m.text,
                            m.body
                        ].filter(Boolean).join(' ');

                        const waLink1 = `wa.me/${ownerNumber}`;
                        const waLink2 = `https://wa.me/${ownerNumber}`;
                        const waLink3 = `https://api.whatsapp.com/send?phone=${ownerNumber}`;

                        const textHasOwner =
                            allText.includes(ownerNumber)      ||
                            allText.includes(`@${ownerNumber}`) ||
                            allText.includes(ownerJid)         ||
                            allText.includes(waLink1)          ||
                            allText.includes(waLink2)          ||
                            allText.includes(waLink3);

                        // ─── 4. EXECUTE ───
                        if (isMentioned || textHasOwner) {
                            if (mentionConfig.action === 'react' && mentionConfig.emoji) {
                                await sock.sendMessage(m.chat, {
                                    react: { text: mentionConfig.emoji, key: m.key }
                                }).catch(() => {});
                            } else if (mentionConfig.action === 'text' && mentionConfig.text) {
                                await sock.sendMessage(m.chat, {
                                    text: mentionConfig.text
                                }, { quoted: m }).catch(() => {});
                            }
                        }
                    }
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   SHAZAM REPLY HANDLER
            // ─────────────────────────────────────────────────────────────
            try {
                const { handleShazamReply } = require('./src/Commands/Search/shazam.js');
                const handled = await handleShazamReply(sock, m, reply);
                if (handled) return;
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   AUTO‑REACT (Random Emoji) - FIXED
            // ─────────────────────────────────────────────────────────────
            try {
                const autoreact = require('./src/Commands/Owner/autoreact.js');
                // ✅ Fixed: call isEnabled() as a function
                if (autoreact.isEnabled() && !m.key.fromMe && m.text) {
                    const randomEmoji = autoreact.getRandomEmoji();
                    await sock.sendMessage(m.chat, {
                        react: { text: randomEmoji, key: m.key }
                    }).catch(() => {});
                }
            } catch (err) {
                console.error('[AUTOREACT ERROR]', err.message);
            }

            // ─────────────────────────────────────────────────────────────
            //                   ANTI WORD (Banned Words)
            // ─────────────────────────────────────────────────────────────
            try {
                const antiword = require('./src/Commands/Admin/antiword.js');
                if (antiword?.handleAntiWord) await antiword.handleAntiWord(sock, m, mek);
            } catch (err) {
                console.error('[ANTIWORD ERROR]', err.message);
            }
            // SS Reply Trigger
try {
    const sscmd = require('./src/Commands/Owner/⎔.js')
    if (sscmd?.handleSSReply) await sscmd.handleSSReply(sock, m)
} catch {}

            // ─────────────────────────────────────────────────────────────
            //                   MAIN COMMAND ENGINE
            // ─────────────────────────────────────────────────────────────
            await handleMessage(sock, m, customStore);

            // ─────────────────────────────────────────────────────────────
            //                   CRYSNOVA AI AUTO-REPLY
            // ─────────────────────────────────────────────────────────────
            try {
                const crysnova = require('./src/Commands/AI/crysnova.js');
                const msgText  = (m.text || '').toLowerCase().trim();

                if (
                    msgText.startsWith('.crysnova') ||
                    msgText.startsWith('.ai')       ||
                    msgText.startsWith('.crys')
                ) {
                    // handled above by handleMessage
                } else if (crysnova?.onMessage) {
                    await crysnova.onMessage(sock, m);
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   OTHER FEATURES
            // ─────────────────────────────────────────────────────────────

            // Anti Group Mention
            try {
                const antigm = require('./src/Commands/Admin/antigm.js');
                if (antigm?.handleAntiGM) await antigm.handleAntiGM(sock, m, mek);
            } catch {}

            // VV Reply Trigger
            try {
                const vvcmd = require('./src/Commands/Converter/vvcmd.js');
                if (vvcmd?.handleVVReply) await vvcmd.handleVVReply(sock, m);
            } catch {}

            // Anti-Link
            try {
                const anti = require('./src/Plugin/antilink.js');
                if (anti?.handleAntiLink) await anti.handleAntiLink(sock, m);
            } catch {}

            // Auto React on Tag
            try {
                if (m.isGroup && m.mentionedJid?.length) {
                    const botJid = (sock.user?.id || '').replace(/:\d+@/, '@');
                    const tagged = m.mentionedJid.some(j => j.replace(/:\d+@/, '@') === botJid);
                    if (tagged) {
                        const emoji = getVar('TAG_REACT_EMOJI') || process.env.TAG_REACT_EMOJI || '';
                        if (emoji) {
                            await sock.sendMessage(m.chat, {
                                react: { text: emoji, key: m.key }
                            }).catch(() => {});
                        }
                    }
                }
            } catch {}

        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log(chalk.red('[MSG ERROR]'), err.message);
            }
        }
    });

    // AntiDelete + messages.update
    sock.ev.on('messages.update', async (updates) => {

        // Anti-Delete
        try {
            const antidelete = require('./src/Commands/Tools/antidelete.js');
            if (antidelete?.onDelete) await antidelete.onDelete(sock, updates, customStore);
        } catch {}

        // quoted.js lives in library/
        try {
            const quoted = require('./library/quoted.js');
            if (quoted?.onDelete) await quoted.onDelete(sock, updates, customStore);
        } catch {}
    });
};

// Auto-clean quoted temp store
setInterval(() => {
    try {
        const quoted = require('./library/quoted.js');
        if (quoted?.cleanUp) quoted.cleanUp();
    } catch {}
}, 60000);
