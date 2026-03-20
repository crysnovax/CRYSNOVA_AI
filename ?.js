/**
 * ╔══════════════════════════════════════════════════╗
 * ║   - ZEE BOT V2          ║
 * ║   CRYSNOVA AI V2 Message Routing Engine          ║
 * ╚══════════════════════════════════════════════════╝
 */

const chalk = require('chalk');
const { setupStatusHandler } = require('./src/Plugin/statusHandler');
const { getVar }             = require('./src/Plugin/configManager');

const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, smsg, io, config) {

    // ── Auto Status View + Like (Kord AI style) ────────────────
    setupStatusHandler(sock);

    // ── messages.upsert (CRYSNOVA V2 routing) ─────────────────
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek || !mek.message) return;

            // Status is handled exclusively by statusHandler above
            if (mek.key?.remoteJid === 'status@broadcast') return;

            // Handle ephemeral messages
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

            // ── Invisible Tag (@everyone) ──────────────────────
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

            // ── Mute User Check ───────────────────────────────
            try {
                const mutePlugin = require('./src/Commands/Group/muteuser.js');
                if (mutePlugin?.handleMutedMessage) {
                    const wasDeleted = await mutePlugin.handleMutedMessage(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            // ── Main Command Engine ────────────────────────────
            await handleMessage(sock, m, customStore);

            // ── Anti-Link ──────────────────────────────────────
            try {
                const anti = require('./src/Plugin/antilink.js');
                if (anti?.handleAntiLink) await anti.handleAntiLink(sock, m);
            } catch {}

            // ── Auto React when Bot is Tagged in a group ───────
            try {
                if (m.isGroup && m.mentionedJid?.length) {
                    const botJid   = (sock.user?.id || '').replace(/:\d+@/, '@');
                    const tagged   = m.mentionedJid.some(j => j.replace(/:\d+@/, '@') === botJid);
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

            // ── AI Auto Reply (non-command messages only) ──────
            try {
                const cfg    = config();
                const prefix = cfg.settings?.prefix || '.';
                if (m.text && !m.key.fromMe && !m.text.startsWith(prefix) && cfg.autoReply?.enabled) {
                    const autoReply = require('./src/Commands/AI/autoreply.js');
                    if (autoReply?.onMessage) await autoReply.onMessage(sock, m, cfg);
                }
            } catch {}

        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log(chalk.red('[MSG ERROR]'), err.message);
            }
        }
    });

    // ── AntiDelete System ──────────────────────────────────────
    sock.ev.on('messages.update', async (updates) => {
        try {
            const antidelete = require('./src/Commands/Tools/antidelete.js');
            if (antidelete?.onDelete) await antidelete.onDelete(sock, updates, customStore);
        } catch {}
    });
};
