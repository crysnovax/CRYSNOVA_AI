/** 
 * ╔══════════════════════════════════════════════════╗
 * ║    CRYSNOVA MESSAGE HANDLER - Obfuscated Core   ║
 * ║             © CRYSNOVA 2026                      ║
 * ╚══════════════════════════════════════════════════╝
 */

const chalk = require('chalk');

// Ignored errors list
const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

/**
 * Message handler export
 * @param {object} sock - WhatsApp socket
 * @param {object} customStore - Message store
 * @param {function} handleMessage - Command handler
 * @param {function} handleCreatorCommand - Creator command handler
 * @param {function} smsg - Message serializer
 * @param {object} io - Socket.IO instance
 * @param {function} config - Config loader
 */
module.exports = function setupMessageHandler(sock, customStore, handleMessage, handleCreatorCommand, smsg, io, config) {
    
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek || !mek.message) return;

            if (mek.message.ephemeralMessage) {
                mek.message = mek.message.ephemeralMessage.message;
            }

            const m = await smsg(sock, mek, customStore);
            if (!m) return;

            global.crysStats.messages++;

            io.emit('new-message', {
                from: m.sender,
                chat: m.chat,
                text: m.text || '[Media]',
                isGroup: m.isGroup,
                time: Date.now()
            });

            // ── Creator Command Check ──────────────────────────
            if (m.text && !m.key.fromMe) {
                const isCreatorCmd = await handleCreatorCommand(sock, m, m.text);
                if (isCreatorCmd) return;
            }

            // ── Invisible Tag (@everyone) ──────────────────────
            if (m.text && m.text.startsWith('\u200E\u200E') && m.isGroup) {
                try {
                    const metadata = await sock.groupMetadata(m.chat);
                    const participants = metadata.participants.map(p => p.id);
                    if (participants.length) {
                        const cleanText = m.text.slice(2);
                        await sock.sendMessage(m.chat, {
                            text: cleanText || '\u200E',
                            mentions: participants
                        }, { quoted: m });
                    }
                } catch {}
                return;
            }

            // ── Mute User Check ───────────────────────────────
            try {
                const mutePlugin = require('./src/Commands/Group/muteuser.js');
                const wasDeleted = await mutePlugin.handleMutedMessage(sock, m, m.isGroup);
                if (wasDeleted) return;
            } catch (err) {
                console.error('[MUTE CHECK ERROR]', err.message);
            }

            // ── Mute Sticker Check ────────────────────────────
            try {
                const muteSticker = require('./src/Commands/Group/mutesticker.js');
                if (muteSticker?.onMessage) {
                    await muteSticker.onMessage(sock, m);
                }
            } catch {}

            // ── Main Command Engine ───────────────────────────
            await handleMessage(sock, m, customStore);

            // ── AFK System ────────────────────────────────────
            if (!m.key.fromMe) {
                const afkMap = global.afk;
                const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const senderJid = m.key.participant || m.key.remoteJid;
                const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

                // Bot is AFK
                if (afkMap.has(botJid)) {
                    const afkData = afkMap.get(botJid);
                    const timeAgo = Math.floor((Date.now() - afkData.time) / 1000 / 60);
                    let botAfkReply = `╭─❍ *AFK NOTICE* 𓉤\n`;
                    botAfkReply += `│ I'm currently **OFFLINE**\n`;
                    botAfkReply += `│ Reason: ${afkData.reason}\n`;
                    botAfkReply += `│ Since: ${timeAgo} minute${timeAgo !== 1 ? 's' : ''} ago\n`;
                    botAfkReply += `╰─ 𓄄 _Will reply when back_`;
                    await sock.sendMessage(m.key.remoteJid, { text: botAfkReply }, { quoted: m });
                }

                // Mentioned user is AFK
                const isMentionedAfk = mentioned.some(jid => afkMap.has(jid));
                if (isMentionedAfk) {
                    const targetJid = mentioned.find(jid => afkMap.has(jid));
                    const afkData = afkMap.get(targetJid);
                    const timeAgo = Math.floor((Date.now() - afkData.time) / 1000 / 60);
                    let afkAlert = `╭─❍ *AFK ALERT* 𓉤\n`;
                    afkAlert += `│ @${targetJid.split('@')[0]} is currently **OFFLINE**\n`;
                    afkAlert += `│ Reason: ${afkData.reason}\n`;
                    afkAlert += `│ Been AFK for: ${timeAgo} minute${timeAgo !== 1 ? 's' : ''}\n`;
                    afkAlert += `╰─ 𓉤 _Message will be seen when back_`;
                    await sock.sendMessage(m.key.remoteJid, {
                        text: afkAlert,
                        mentions: [targetJid]
                    }, { quoted: m });
                }

                // User is back from AFK
                if (afkMap.has(senderJid)) {
                    const afkData = afkMap.get(senderJid);
                    const timeAgo = Math.floor((Date.now() - afkData.time) / 1000 / 60);
                    afkMap.delete(senderJid);
                    let backMsg = `╭─❍ *BACK ONLINE* 𓉤\n`;
                    backMsg += `│ ${m.pushName || senderJid.split('@')[0]} is back!\n`;
                    backMsg += `│ Was AFK for: ${timeAgo} minute${timeAgo !== 1 ? 's' : ''}\n`;
                    backMsg += `╰────────────────`;
                    await sock.sendMessage(m.key.remoteJid, {
                        text: backMsg,
                        mentions: [senderJid]
                    }, { quoted: m });
                }
            }

            // ── Anti-Link ─────────────────────────────────────
            try {
                const anti = require('./src/Plugin/antilink.js');
                if (anti?.handleAntiLink) {
                    await anti.handleAntiLink(sock, m);
                }
            } catch {}

            // ── Mention Reaction ──────────────────────────────
            try {
                const mentionReact = require('./src/Commands/Owner/mention-react.js');
                if (mentionReact?.handleMentionReaction) {
                    await mentionReact.handleMentionReaction(sock, m);
                }
            } catch {}

            // ── AI Auto-Reply ─────────────────────────────────
            if (m.text && !m.key.fromMe && !m.text.startsWith(config().prefix)) {
                try {
                    let crysAI = null;
                    try {
                        crysAI = require('./src/Commands/AI/crysnova.js');
                    } catch (e) {}
                    if (crysAI?.onMessage) {
                        await crysAI.onMessage(sock, m);
                    }
                } catch (aiErr) {
                    console.error('[AI AUTO]', aiErr.message);
                }
            }

        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log(chalk.red('[MSG ERROR]'), err.message);
            }
        }
    });
    // ── AntiDelete System ───────────────────────────
sock.ev.on('messages.update', async (updates) => {

try {

const antidelete = require('./src/Commands/Tools/antidelete.js')

if (antidelete?.onDelete) {
await antidelete.onDelete(sock, updates, customStore)
}

} catch (err) {
console.log('[ANTIDELETE ERROR]', err.message)
}
});
};
