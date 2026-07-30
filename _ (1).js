/**
 * ╔══════════════════════════════════════════════════╗
 * ║   - CODY AI          ║
 * ║  Message Routing Engine  
 * ║   This is a property of CRYSNOVA AI/CODY AI all rights reserved 
 * ╚══════════════════════════════════════════════════╝
 */


const chalk = require('chalk');
const { setupStatusHandler } = require('./src/Plugin/statusHandler');
const { getVar }             = require('./src/Plugin/configManager');

const styles  = require("./src/Commands/Core/'.js");
const botFont = require('./src/Commands/Bot/botfont.js');

const { translate } = require('./src/Commands/Core/✐.js');
const { getLang }   = require('./src/Commands/Bot/botlang.js');
const { setupMuteSchedules } = require('./src/Commands/Admin/Mute')
//setupMuteSchedules(sock)

// plogme integration
const plogmeCmd = require('./src/Commands/Core/plogme.js');

const MARKER = '\u200E';

// plogme dedupe set
const _plogmeHandled = new Set();
setInterval(() => _plogmeHandled.clear(), 60_000);

const translationCache = new Map();
const CACHE_TTL = 3600000;

// Message TTL: 48 hours in milliseconds
const MESSAGE_TTL = 48 * 60 * 60 * 1000;

const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, smsg, io, config) {

const originalSend = sock.sendMessage.bind(sock);
sock.sendMessage = async (jid, content, options = {}) => {
    try {
        if (jid === 'status@broadcast') {
            return originalSend(jid, content, options);
        }

        const processText = async (inputText) => {
            if (!inputText || typeof inputText !== 'string') return inputText;
            let text = inputText;

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

            const font = botFont.getFont(jid);
            if (font && styles[font]) {
                text = styles[font](text);
            }
            return text;
        };

        if (content?.text) {
            content.text = await processText(content.text);
            content.text = (content.text || '') + MARKER;
        }

        if (content?.caption) {
            content.caption = await processText(content.caption);
            content.caption = (content.caption || '') + MARKER;
        }

        const aiEnabled = getVar('AI_BADGE', true);
        let isPrivateChat = false;
        const jidStr = typeof jid === 'string' ? jid : (Array.isArray(jid) ? jid[0] : '');
        if (jidStr) {
            isPrivateChat = (jidStr.endsWith('@s.whatsapp.net') || jidStr.endsWith('@lid')) 
                         && !jidStr.includes('@g.us');
        }
        if (aiEnabled && isPrivateChat) {
            content.ai = true;
        }
        content.secureMetaServiceLabel = true;

        // ─────────────────────────────────────────────────────────────
       
        // ─────────────────────────────────────────────────────────────
        const isMediaMessage = !!(
            content?.image ||
            content?.video ||
            content?.caption
        );

        if (isMediaMessage && !options.skipVerified) {
            // Library now handles the verified badge context + synthetic
            // quoted fallback internally via the verifiedMe flag
            content.verifiedMe = true;
        }

    } catch (err) {
        console.error('[SEND OVERRIDE ERROR]', err.message);
    }
    return originalSend(jid, content, options);
};

    setupStatusHandler(sock);

const { patchGroupEvents } = require('./src/Plugin/groupEventsPatch');
patchGroupEvents(sock);

const { setupPromotionGuard } = require('./src/Plugin/promotionGuard');
setupPromotionGuard(sock);

    const econ = require('./src/Commands/Economy/econ.js');
  //  econ.startNotifChecker(sock);

    try {
        const autonews = require('./src/Commands/Owner/ཽ.js');
        autonews.startAutoNews(sock);
    } catch (err) {
        console.error('[AUTONEWS] Init error:', err.message);
    }

    sock.ev.on('call', async (calls) => {
        try {
            const {
                loadConfig, saveConfig, isWithinSchedule,
                isInBlacklist, isInWhitelist, normalizeJid
            } = require('./src/Plugin/anticallManager');

            const config = loadConfig();
            if (!config.enabled) return;

            if (!config.pendingPhoneReject) config.pendingPhoneReject = [];

            const ownerJid = `${config.owner || process.env.OWNER_NUMBER}@s.whatsapp.net`;

            for (const call of calls) {
                if (call.status !== 'offer') continue;

                const callerJid = call.from;
                const normalizedCaller = normalizeJid(callerJid);
                const phoneMatch = normalizedCaller.match(/^(\d+)@s\.whatsapp\.net$/);
                const callerPhone = phoneMatch ? phoneMatch[1] : null;

                if (isInWhitelist(normalizedCaller, config.whitelist)) continue;
                if (isInBlacklist(normalizedCaller, config.blacklist)) {
                    await sock.sendMessage(callerJid, { text: config.reason }).catch(() => {});
                    if (typeof sock.rejectCall === 'function') await sock.rejectCall(call.id, call.from).catch(() => {});
                    continue;
                }

                if (callerPhone && config.pendingPhoneReject.includes(callerPhone)) {
                    config.blacklist = config.blacklist.filter(b => normalizeJid(b) !== `${callerPhone}@s.whatsapp.net`);
                    if (!config.blacklist.includes(normalizedCaller)) config.blacklist.push(normalizedCaller);
                    config.pendingPhoneReject = config.pendingPhoneReject.filter(p => p !== callerPhone);
                    saveConfig(config);
                }

                if (!isWithinSchedule(config.schedule)) continue;

                let reasonToSend = config.reason;
                let isUnknown = false;
                if (!callerPhone || !config.pendingPhoneReject.includes(callerPhone)) {
                    isUnknown = true;
                    reasonToSend = config.unknownReason || config.reason;
                }

                await sock.sendMessage(callerJid, { text: reasonToSend }).catch(() => {});
                if (typeof sock.rejectCall === 'function') await sock.rejectCall(call.id, call.from).catch(() => {});

                if (isUnknown) {
                    const dmMsg = `📵 *Unknown call blocked*\nCaller JID: \`${normalizedCaller}\`\n\n_To block: *.anticall reject add ${normalizedCaller}*_\n_To whitelist: *.anticall whitelist [...]`;
                    await sock.sendMessage(ownerJid, { text: dmMsg }).catch(() => {});
                }
            }
        } catch (err) {
            console.error('[ANTICALL ERROR]', err.message);
        }
    });

    try {
        const vv = require('./src/Commands/Converter/view-once.js');
        if (vv?.setup) vv.setup(sock, customStore);
    } catch {}

    try {
        const muteCmd = require('./src/Commands/Admin/Mute.js');
        if (muteCmd?.setupMuteSchedules) muteCmd.setupMuteSchedules(sock);
    } catch {}

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

            try {
                const antiedit = require('./src/Commands/Tools/antiedit.js');
                if (antiedit?.cacheOriginal) antiedit.cacheOriginal(mek.key.id, mek.message);
            } catch (err) {}

            if (getVar('AUTO_READ', false)) {
                await sock.readMessages([mek.key]).catch(() => {});
            }

            // ========== STORE MESSAGE WITH TIMESTAMP (48 HOUR TTL) ==========
            if (mek.key?.remoteJid && mek.key?.id) {
                customStore.messages.set(mek.key.remoteJid + ':' + mek.key.id, {
                    message: mek,
                    timestamp: Date.now()
                });
            }

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
//WARNING ⚠️ PLEASE DON'T UNCOMMENT NO MATTER WHO 
    //   if (m.text && m.text.startsWith('\u200E\u200E\u200E\u200E\u200E') && m.isGroup) {
    //       try {
                //    const metadata = await sock.groupMetadata(m.chat);
            //        const participants = metadata.participants.map(p => p.id);
    //           if (participants.length) {
               //         await sock.sendMessage(m.chat, {
                      //     text: m.text.slice(2) || '\u200E',
     //                      mentions: participants
              //       }, { quoted: m });
           //      }
      //          } catch {}
             //   return;
       //     }

            try {
                const mutePlugin = require('./src/Commands/Group/muteuser.js');
                if (mutePlugin?.handleMutedMessage) {
                    const wasDeleted = await mutePlugin.handleMutedMessage(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            try {
                const mutesticker = require('./src/Commands/Group/mutesticker.js');
                if (mutesticker?.handleMutedSticker) {
                    const wasDeleted = await mutesticker.handleMutedSticker(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            try {
                const typingMode = getVar('FAKE_TYPING', 'off');
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

            try {
                const autoRecording = getVar('AUTO_RECORDING', config?.mode?.autoRecording ?? false);
                if (autoRecording) {
                    await sock.sendPresenceUpdate('recording', m.key.remoteJid);
                }
            } catch {}
            // Welcome Flow - new contact greeting
try {
    const greet = require('./src/Commands/Bot/greet.js');
    // Check if this is a new contact
    const isGroup = m.key?.remoteJid?.includes('@g.us');
    const sender = m.sender;
    await greet.handleNewContact(sock, sender, isGroup);
    
    // Handle greet button clicks
    const handled = await greet.handleGreetButton(sock, m);
    if (handled) return;
} catch {}

            // ========== AFK SYSTEM ==========
            const afkCmd = require('./src/Commands/Owner/afk.js');
            const AFK_MARKER = afkCmd.MARKER;
           
            if (m.mtype === 'reactionMessage') return;
            if (m.body && m.body.includes(AFK_MARKER)) return;

            const _afkSender = await afkCmd.resolveSenderPhoneJid(sock, m);
            if (_afkSender && afkCmd.disableAfk(_afkSender, m.chat)) {
                await sock.sendMessage(m.chat, { text: '```Welcome back!```' + AFK_MARKER }, { quoted: m });
            }

            const afkUser = await afkCmd.isAfkUserMentioned(m, mek, sock);
            const senderIsAfkUser = afkUser && await afkCmd.isSameIdentity(sock, afkUser, _afkSender);
            if (afkUser && !senderIsAfkUser) {
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

... (truncated for brevity)