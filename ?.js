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

const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, smsg, io, config) {

    // BOTFONT OVERRIDE (GLOBAL)
    const originalSend = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
        try {
            if (content?.text) {
                const font = botFont.getFont(jid);
                if (font && styles[font]) {
                    content.text = styles[font](content.text);
                }
            }
        } catch {}
        return originalSend(jid, content, options);
    };

    // Auto Status View + Like
    setupStatusHandler(sock);

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

    // messages.upsert
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

            if (mek.key?.remoteJid && mek.key?.id) {
                customStore.messages.set(mek.key.remoteJid + ':' + mek.key.id, mek);
            }

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
                if (getVar('FAKE_TYPING', true) !== false) {
                    await sock.sendPresenceUpdate('composing', m.key.remoteJid);
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   ANTI TAG  ← FIX #2: was never called
            // ─────────────────────────────────────────────────────────────
            try {
                const antitag = require('./src/Commands/Tools/antitag.js');
                if (antitag?.handleAntiTag) await antitag.handleAntiTag(sock, m);
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
                    msgText.startsWith('.ai') ||
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
                const antigm = require('./src/Commands/Tools/antigm.js');
                if (antigm?.handleAntiGM) await antigm.handleAntiGM(sock, m);
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

        // FIX #3: quoted.js lives in library/, NOT src/Commands/Tools/
        try {
            const quoted = require('./library/quoted.js');
            if (quoted?.onDelete) await quoted.onDelete(sock, updates, customStore);
        } catch {}
    });
};

// Auto-clean quoted temp store
// FIX #3 continued: same wrong path fixed here too
setInterval(() => {
    try {
        const quoted = require('./library/quoted.js');
        if (quoted?.cleanUp) quoted.cleanUp();
    } catch {}
}, 60000);
