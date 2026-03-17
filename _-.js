/**
╔══════════════════════════════════════════════════
║             © CRYSNOVA 2026                      ║
╚══════════════════════════════════════════════════╝
*/

const chalk = require('chalk');

// ✅ ADD THESE (BOT FONT)
const styles = require("./src/Commands/Core/'.js"); 
const botFont = require("./src/Commands/Bot/botfont.js");

// Ignored errors list
const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, handleCreatorCommand, smsg, io, config) {

    // 🔥 GLOBAL SENDMESSAGE OVERRIDE (BOT FONT WORKS EVERYWHERE)
    const originalSend = sock.sendMessage.bind(sock);

    sock.sendMessage = async (jid, content, options = {}) => {
        try {
            if (content?.text) {
                const font = botFont.getFont(jid);

                if (font && styles[font]) {
                    content.text = styles[font](content.text);
                }
            }
        } catch (e) {}

        return originalSend(jid, content, options);
    };

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
            if (m.text && m.text.startsWith('\u200E\u200E\u200E\u200E\u200E') && m.isGroup) {        
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

            // ── AI AUTO REPLY ──
            try {
                if (m.text && !m.key.fromMe) {
                    const crysAI = require('./src/Commands/AI/crysnova.js');
                    if (crysAI?.onMessage) {
                        await crysAI.onMessage(sock, m);
                    }
                }
            } catch (err) {
                console.log('[AI AUTO ERROR]', err.message);
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
