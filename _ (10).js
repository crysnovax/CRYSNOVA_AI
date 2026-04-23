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
const { translate } = require('./src/Commands/Core/✐.js');
const { getLang }   = require('./src/Commands/Bot/botlang.js');

// ────────── HIDDEN MARKER (prevents self‑reply) ──────────
const MARKER = '‎';  // U+200E left‑to‑right mark, invisible

// Translation cache
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
// ────────── BOTFONT + AUTO‑TRANSLATION + VERIFIED BADGE + AI BADGE (DM ONLY) ──────────
const originalSend = sock.sendMessage.bind(sock);
sock.sendMessage = async (jid, content, options = {}) => {
    try {
        // Helper to apply translation + font styling
        const processText = async (inputText) => {
            if (!inputText || typeof inputText !== 'string') return inputText;
            let text = inputText;

            // 1️⃣ AUTO‑TRANSLATION
            const targetLang = getLang(jid);
            if (targetLang && text.trim().length > 0) {
                const skipPatterns = ['.setlang', '.tr', 'Usage:'];
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
            return text;
        };

        // Process text field (plain text messages)
        if (content?.text) {
            content.text = await processText(content.text);
            content.text = (content.text || '') + MARKER;
        }

        // Process caption field (image, video, document, sticker captions)
        if (content?.caption) {
            content.caption = await processText(content.caption);
            content.caption = (content.caption || '') + MARKER;
        }

        // AI Badge - ONLY in private chats (DMs) - HANDLES BOTH @lid and @s.whatsapp.net
        const aiEnabled = getVar('AI_BADGE', true); // Default ON
        
        // Check if this is a private chat (DM) - supports both LID and standard JID
        let isPrivateChat = false;
        const jidStr = typeof jid === 'string' ? jid : (Array.isArray(jid) ? jid[0] : '');
        
        //
        if (jidStr) {
            isPrivateChat = (jidStr.endsWith('@s.whatsapp.net') || jidStr.endsWith('@lid')) 
                         && !jidStr.includes('@g.us');
        }
        
        //  DEBUG LOG
     //   console.log('[AI BADGE DEBUG]', {
         //   jid: jidStr,
      //      aiEnabled,
      //      isPrivateChat,
       //     willApply: aiEnabled && isPrivateChat
     //   });
        
        //  Apply AI badge if conditions met
        if (aiEnabled && isPrivateChat) {
            content.ai = true;
        }

        // ✅ Verified Badge - for media messages
        const isMediaMessage = !!(
            content?.image ||
            content?.video ||
        //    content?.document ||
         //   content?.gif ||
            content?.ptv ||
            content?.caption
        );

        // Skip if explicitly disabled or if it's a plain text message
        if (isMediaMessage && !options.skipVerified) {
            content.contextInfo = {
                ...(content.contextInfo || {}),
                forwardingScore: 999,
                isForwarded: true,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                quotedMessage: {
                    conversation: "```⌘ CRYSN☉VA AI 𓀀```"
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402922206865@newsletter',
                    newsletterName: '𝓬𝓻𝔂𝓼𝓷𝓸𝓿𝓪 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭 ✓',
                    serverMessageId: 1
                }
            };

            if (!options.quoted) {
                options.quoted = {
                    key: {
                        remoteJid: "status@broadcast",
                        fromMe: false,
                        participant: "0@s.whatsapp.net",
                        id: "3EB0" + Math.random().toString(16).substring(2, 10).toUpperCase()
                    },
                    message: {
                        conversation: "```ஃ𖠃 CRYSN⚉VA AI🜲```"
                    }
                };
            }
        }

    } catch (err) {
        console.error('[SEND OVERRIDE ERROR]', err.message);
    }
    return originalSend(jid, content, options);
};
    // Auto Status View + Like + Ghost Mode
    setupStatusHandler(sock);

    // Anti Call with detailed logging for debugging
sock.ev.on('call', async (calls) => {
    try {
        const {
            loadConfig,
            saveConfig,
            isWithinSchedule,
            isInBlacklist,
            isInWhitelist,
            normalizeJid
        } = require('./src/Plugin/anticallManager');

        const config = loadConfig();
        if (!config.enabled) return;

        // Ensure pendingPhoneReject exists
        if (!config.pendingPhoneReject) config.pendingPhoneReject = [];

        const ownerJid = `${config.owner || process.env.OWNER_NUMBER}@s.whatsapp.net`;

        for (const call of calls) {
            if (call.status !== 'offer') continue;

            const callerJid = call.from;
            const normalizedCaller = normalizeJid(callerJid);
            const phoneMatch = normalizedCaller.match(/^(\d+)@s\.whatsapp\.net$/);
            const callerPhone = phoneMatch ? phoneMatch[1] : null;

            console.log(`[ANTICALL] Call from: ${callerJid} → norm: ${normalizedCaller}`);

            // 1. Whitelist
            if (isInWhitelist(normalizedCaller, config.whitelist)) {
                console.log(`[ANTICALL] Whitelisted — allowing`);
                continue;
            }

            // 2. Blacklist
            if (isInBlacklist(normalizedCaller, config.blacklist)) {
                await sock.sendMessage(callerJid, { text: config.reason }).catch(() => {});
                if (typeof sock.rejectCall === 'function') {
                    await sock.rejectCall(call.id, call.from).catch(() => {});
                }
                console.log(`[ANTICALL] Blacklisted — rejected`);
                continue;
            }

            // 3. Check if this call matches a pending phone reject (LID just revealed)
            if (callerPhone && config.pendingPhoneReject.includes(callerPhone)) {
                // Replace the phone entry with the actual LID in blacklist
                config.blacklist = config.blacklist.filter(b => normalizeJid(b) !== `${callerPhone}@s.whatsapp.net`);
                if (!config.blacklist.includes(normalizedCaller)) {
                    config.blacklist.push(normalizedCaller);
                }
                // Remove from pending
                config.pendingPhoneReject = config.pendingPhoneReject.filter(p => p !== callerPhone);
                saveConfig(config);
                console.log(`[ANTICALL] Upgraded phone ${callerPhone} to LID ${normalizedCaller} in blacklist`);
            }

            // 4. Schedule check
            if (!isWithinSchedule(config.schedule)) {
                console.log(`[ANTICALL] Outside schedule — ignoring`);
                continue;
            }

            // 5. Determine which reason to use
            let reasonToSend = config.reason;
            let isUnknown = false;
            if (!callerPhone || !config.pendingPhoneReject.includes(callerPhone)) {
                // If not a known pending number, treat as unknown
                isUnknown = true;
                reasonToSend = config.unknownReason || config.reason;
            }

            // 6. Reject the call
            await sock.sendMessage(callerJid, { text: reasonToSend }).catch(() => {});
            if (typeof sock.rejectCall === 'function') {
                await sock.rejectCall(call.id, call.from).catch(() => {});
            }

            // 7. Send DM to owner with the LID for unknown calls
            if (isUnknown) {
                const dmMsg = `📵 *Unknown call blocked*\n` +
                    `Caller JID: \`${normalizedCaller}\`\n\n` +
                    `_To permanently block:_\n` +
                    `*.anticall reject add ${normalizedCaller}*\n\n` +
                    `_To whitelist:_\n` +
                    `*.anticall whitelist add ${normalizedCaller}*`;
                await sock.sendMessage(ownerJid, { text: dmMsg }).catch(() => {});
            }

            console.log(`[ANTICALL] Rejected — JID: ${normalizedCaller}`);
        }
    } catch (err) {
        console.error('[ANTICALL ERROR]', err.message);
    }
});

    // VV Reaction Listener
    try {
        const vv = require('./src/Commands/Converter/view-once.js');
        if (vv?.setup) vv.setup(sock, customStore);
    } catch {}

    // Restore mute schedules
    try {
        const muteCmd = require('./src/Commands/Admin/Mute.js');
        if (muteCmd?.setupMuteSchedules) muteCmd.setupMuteSchedules(sock);
    } catch {}

    // Presence tracking
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

            // ── Cache original message for antiedit (before any processing) ──
            try {
                const antiedit = require('./src/Commands/Tools/antiedit.js');
                if (antiedit?.cacheOriginal) {
                    antiedit.cacheOriginal(mek.key.id, mek.message);
                }
            } catch (err) {
                // ignore cache errors
            }

            // ── Auto Read ─────────────────────────────────────────────────
            if (getVar('AUTO_READ', true)) {
                await sock.readMessages([mek.key]).catch(() => {});
            }

            if (mek.key?.remoteJid && mek.key?.id) {
                customStore.messages.set(mek.key.remoteJid + ':' + mek.key.id, mek);
            }

            // Cache message for antidelete (legacy)
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
                    const metadata = await sock.groupMetadata(m.chat);
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
                    const bodyCheck = (mek.message?.conversation || mek.message?.extendedTextMessage?.text || '').trim();
                    const prefixCheck = getVar('PREFIX', '.');
                    if (bodyCheck.startsWith(prefixCheck)) {
                        await sock.sendPresenceUpdate('composing', m.key.remoteJid);
                    }
                }
            } catch {}
            // Auto Recording (shows "recording..." while processing)
try {
    const autoRecording = getVar('AUTO_RECORDING', config?.mode?.autoRecording ?? true);
    if (autoRecording) {
        await sock.sendPresenceUpdate('recording', m.key.remoteJid);
    }
} catch {}

// ========== AFK SYSTEM ==========
const afkCmd = require('./src/Commands/Owner/afk.js');
const AFK_MARKER = afkCmd.MARKER;
   
if (m.mtype === 'reactionMessage') return;

if (m.body && m.body.includes(AFK_MARKER)) return;

const _afkSender = (sock.user?.id || m.sender || '').replace(/:\d+@/, '@s.whatsapp.net');
if (m.key?.fromMe && afkCmd.disableAfk(_afkSender, m.chat)) {
    await sock.sendMessage(m.chat, {
        text: '```Welcome back!```' + AFK_MARKER
    }, { quoted: m });
}

const afkUser = afkCmd.isAfkUserMentioned(m, mek, sock);
if (afkUser && afkUser !== m.sender) {
    const data = afkCmd.getAfk(afkUser, m.chat);
    if (data) {
        const elapsed = Date.now() - data.timestamp;
        const mins = Math.floor(elapsed / 60000);
        const hrs = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);
        let timeAgo = '';
        if (days > 0) timeAgo = `${days}d ${hrs % 24}h`;
        else if (hrs > 0) timeAgo = `${hrs}h ${mins % 60}m`;
        else timeAgo = `${mins}m`;

        const notice = `╭─❍ *AFK NOTICE* 𓉤\n│\n│ 𓃼 @${afkUser.split('@')[0]}\n│ ⓘ Reason : ${data.reason}\n│ 𓄄 Last seen : ${timeAgo} ago\n│ ✐ Mentions : ${data.mentions || 0}\n╰──────────────────`;
        await sock.sendMessage(m.chat, {
            text: notice + AFK_MARKER,
            mentions: [afkUser]
        }, { quoted: m });
        afkCmd.incrementMention(afkUser, m.chat);
    }
}
// ========== END AFK SYSTEM ==========

            // ── ANTI TAG ─────────────────────────────────────────────
            try {
                const antitag = require('./src/Commands/Admin/antitag.js');
                if (antitag?.handleAntiTag) await antitag.handleAntiTag(sock, m);
            } catch {}

            // ── STICKER COMMAND HANDLER ─────────────────────────────
            try {
                if (m.mtype === 'stickerMessage') {
                    const { stickerCmds } = require('./src/Commands/Owner/setcmd.js');
                    const stickerData = m.message?.stickerMessage;
                    const fileSha256 = stickerData?.fileSha256;
                    if (fileSha256) {
                        const hash = Buffer.isBuffer(fileSha256) ? fileSha256.toString('hex') : String(fileSha256);
                        if (hash && stickerCmds[hash]) {
                            const boundCmd = stickerCmds[hash];
                            console.log(`[STICKER CMD] ${m.sender.split('@')[0]} -> ${boundCmd}`);
                            m.body = `.${boundCmd}`;
                            m.text = `.${boundCmd}`;
                        }
                    }
                }
            } catch {}
            // Anti Spam
try {
    const antispam = require('./src/Commands/Admin/antispam.js');
    if (antispam?.handleAntiSpam) await antispam.handleAntiSpam(sock, m);
} catch (err) {
    console.error('[ANTISPAM ERROR]', err.message);
}

            // ── OWNER MENTION HANDLER ───────────────────────────────
            try {
                const { mentionConfig } = require('./src/Commands/Owner/mention.js');
                if (mentionConfig.active) {
                    const config = require('./settings/config');
                    const ownerNumber = (process.env.OWNER_NUMBER || config.owner || '').replace(/[^0-9]/g, '');
                    if (ownerNumber) {
                        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
                        const botPnJid = (sock.user?.id || '').replace(/:\d+@/, '@s.whatsapp.net');
                        const botLid = sock.user?.lid || '';
                        const sender = (m.sender || '').replace(/:\d+@/, '@s.whatsapp.net');
                        if (sender === botPnJid) return;

                        const norm = (j) => (j || '').replace(/:\d+@/, '@').toLowerCase().trim();
                        const rawMsg = mek.message || {};
                        const ctxInfo = rawMsg.extendedTextMessage?.contextInfo ||
                                        rawMsg.imageMessage?.contextInfo ||
                                        rawMsg.videoMessage?.contextInfo ||
                                        rawMsg.documentMessage?.contextInfo || {};
                        const allMentions = [
                            ...(ctxInfo.mentionedJid || []),
                            ...(m.mentionedJid || []),
                            ...(m.msg?.contextInfo?.mentionedJid || []),
                        ];
                        const uniqueMentions = [...new Set(allMentions)].filter(Boolean);
                        let isMentioned = false;
                        for (const jid of uniqueMentions) {
                            const normalized = norm(jid);
                            if (normalized === norm(ownerJid) || normalized === norm(botPnJid)) {
                                isMentioned = true; break;
                            }
                            if (botLid && normalized === norm(botLid)) { isMentioned = true; break; }
                            try {
                                const decoded = sock.decodeJid(jid);
                                if (decoded && norm(decoded) === norm(ownerJid)) { isMentioned = true; break; }
                            } catch {}
                            const participantAlt = ctxInfo.participantAlt || m.msg?.contextInfo?.participantAlt;
                            if (participantAlt && norm(participantAlt) === norm(ownerJid)) { isMentioned = true; break; }
                        }
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
                        const textHasOwner = allText.includes(ownerNumber) ||
                                             allText.includes(`@${ownerNumber}`) ||
                                             allText.includes(ownerJid) ||
                                             allText.includes(waLink1) ||
                                             allText.includes(waLink2) ||
                                             allText.includes(waLink3);
                        if (isMentioned || textHasOwner) {
                            if (mentionConfig.action === 'react' && mentionConfig.emoji) {
                                await sock.sendMessage(m.chat, { react: { text: mentionConfig.emoji, key: m.key } }).catch(() => {});
                            } else if (mentionConfig.action === 'text' && mentionConfig.text) {
                                await sock.sendMessage(m.chat, { text: mentionConfig.text }, { quoted: m }).catch(() => {});
                            }
                        }
                    }
                }
            } catch {}

            // ── SHAZAM REPLY HANDLER ───────────────────────────────
            try {
                const { handleShazamReply } = require('./src/Commands/Search/shazam.js');
                const shazamReply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });
                const handled = await handleShazamReply(sock, m, shazamReply);
                if (handled) return;
            } catch {}

            // ── AUTO‑REACT ─────────────────────────────────────────
            try {
                const autoreact = require('./src/Commands/Owner/autoreact.js');
                if (autoreact.isEnabled() && !m.key.fromMe && m.text) {
                    const randomEmoji = autoreact.getRandomEmoji();
                    await sock.sendMessage(m.chat, { react: { text: randomEmoji, key: m.key } }).catch(() => {});
                }
            } catch (err) { console.error('[AUTOREACT ERROR]', err.message); }

            // ── ANTI WORD ──────────────────────────────────────────
            try {
                const antiword = require('./src/Commands/Admin/antiword.js');
                if (antiword?.handleAntiWord) await antiword.handleAntiWord(sock, m, mek);
            } catch (err) { console.error('[ANTIWORD ERROR]', err.message); }

            // SS Reply Trigger
            try {
                const sscmd = require('./src/Commands/Owner/⎔.js');
                if (sscmd?.handleSSReply) await sscmd.handleSSReply(sock, m);
            } catch {}

            // ── MAIN COMMAND ENGINE ─────────────────────────────────
            await handleMessage(sock, m, customStore);

            // ── CHATBOT AUTO-REPLY ─────────────────────────────────
            const { handleIncomingMessage } = require('./src/Commands/Core/❚.js');
            await handleIncomingMessage(sock, m, mek);

            // ── CRYSNOVA AI AUTO-REPLY ─────────────────────────────
            try {
                const crysnova = require('./src/Commands/AI/crysnova.js');
                const msgText = (m.text || '').toLowerCase().trim();
                if (!(msgText.startsWith('.crysnova') || msgText.startsWith('.ai') || msgText.startsWith('.crys'))) {
                    if (crysnova?.onMessage) await crysnova.onMessage(sock, m);
                }
            } catch {}

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
                        if (emoji) await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {});
                    }
                }
            } catch {}

        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log(chalk.red('[MSG ERROR]'), err.message);
            }
        }
    });

    // AntiDelete + AntiEdit + messages.update
    sock.ev.on('messages.update', async (updates) => {
        // Anti-Delete
        try {
            const antidelete = require('./src/Commands/Tools/antidelete.js');
            if (antidelete?.onDelete) await antidelete.onDelete(sock, updates, customStore);
        } catch {}

        // Anti-Edit
        try {
            const antiedit = require('./src/Commands/Tools/antiedit.js');
            if (antiedit?.onEdit) await antiedit.onEdit(sock, updates, customStore);
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
