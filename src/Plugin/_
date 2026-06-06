/**
 * CRYSNOVA AI V2 — Auto Status Handler
 * Auto view + auto like + auto save
 * + GHOST MODE: Universal reaction eraser (react → 2s → remove)
 */
const { getVar } = require('./configManager');
const chalk      = require('chalk');
const fs         = require('fs');
const path       = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const STATUS_EMOJIS = ['❤️‍🔥', '🔥', '💯', '😍', '👏', '✨', '😂', '🥰', '👀', '🎉', '💪', '⚡','📑','🙀','🎉','📝','😢', '❌', '😩', '👾', '🙏', '🤗', '🥏'];
const randomEmoji   = () => STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)];

const seen = new Set();
let ghostMode = false;

const ASS_CONFIG_PATH = path.join(process.cwd(), 'database', 'autosavestatus.json');
const defaultAssConfig = {
    enabled: false,
    mode: 'dm',
    target: null,
};

function getAssConfig() {
    try {
        if (fs.existsSync(ASS_CONFIG_PATH)) {
            return { ...defaultAssConfig, ...JSON.parse(fs.readFileSync(ASS_CONFIG_PATH, 'utf8')) };
        }
    } catch {}
    return defaultAssConfig;
}

function getOwnerJid() {
    const num = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    return num ? `${num}@s.whatsapp.net` : null;
}

async function autoSaveStatus(sock, msg) {
    const config = getAssConfig();
    if (!config.enabled) return;
    let targetJid = config.mode === 'dm' ? getOwnerJid() : config.target;
    if (!targetJid) return;
    const message = msg.message;
    if (!message) return;
    const type = Object.keys(message).find(key => 
        ['imageMessage', 'videoMessage', 'audioMessage'].includes(key)
    );
    if (!type) return;
    try {
        const mediaMsg = message[type];
        const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const caption = mediaMsg?.caption || '';
        const sendType = 
            type === 'videoMessage' ? 'video' :
            type === 'imageMessage' ? 'image' : 'audio';
        await sock.sendMessage(targetJid, {
            [sendType]: buffer,
            ...(caption ? { caption } : {}),
            ...(sendType === 'audio' ? { mimetype: 'audio/mpeg', ptt: false } : {})
        });
        const posterNum = (msg.key.participant || '').split('@')[0];
        console.log(chalk.cyan(`[ASS] Saved status from ${posterNum} → ${targetJid.split('@')[0]}`));
    } catch (err) {
        console.error('[ASS ERROR]', err.message);
    }
}

/**
 * COMBINE multiple invisible characters - maybe the combination renders as nothing!
 */
function getInvisibleChar() {
    // Try different combinations until one works perfectly
    const combos = [
        '\u200B\u200C\u200D\u2060',                    // All zero-width chars combined
        '\u200C\u200C\u200C\u200C\u200C',              // Multiple ZWNJ
        '\u200B\u200B\u200B\u200B\u200B',              // Multiple ZWSP
        '\u200C\u200D\u200C\u200D',                     // Alternating ZWNJ/ZWJ
        '\u2060\u200B\u2060\u200B',                     // Word joiner + ZWSP
        '\uFEFF\u200C\uFEFF',                           // BOM + ZWNJ
        '\u200C\u200C',                                 // Double ZWNJ (simple but might work)
        '',                                         // 5 actual zero-width spaces
        '\u200B'.repeat(10),                            // 10 ZWSP in a row
        '\u200C'.repeat(10),                            // 10 ZWNJ in a row
    ];
    
    // Return combo #0 (most comprehensive)
    return combos[0];
    
    // If that shows something, try #7 (double ZWNJ)
    // If still shows, try #8 (actual zero-width spaces)
}

async function ghostReact(sock, msg) {
    const posterJid = msg.key.participant;
    const statusId = msg.key.id;
    if (!posterJid || !statusId) return;

    try {
        const invisibleCombo = getInvisibleChar();
        await sock.sendMessage(posterJid, {
            react: { text: invisibleCombo, key: msg.key }
        });
        console.log(chalk.yellow(`[GHOST] Reacted combo on ${statusId.slice(-8)} - length: ${invisibleCombo.length}`));

    } catch (err) {
        console.log(chalk.red(`[GHOST] ✗ Failed: ${err.message}`));
    }
}

const setupStatusHandler = (sock) => {

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            try {
                if (msg.key?.remoteJid !== 'status@broadcast') continue;
                if (!msg.message) continue;

                const msgId = msg.key?.id;
                if (msgId && seen.has(msgId)) continue;
                if (msgId) seen.add(msgId);

                const posterJid = msg.key.participant;
                const posterNum = (posterJid || '').split('@')[0];

                const autoView = getVar('AUTO_STATUS_VIEW', true);
                const autoLike = getVar('AUTO_STATUS_LIKE', true);

                // ── GHOST MODE: Combined invisible chars ───────────────────
                if (ghostMode && posterJid) {
                    await ghostReact(sock, msg);
                }
                // ── Auto View: Combined invisible chars ───────────────────
                else if (autoView && posterJid) {
                    const invisibleCombo = '\u200B\u200C\u200D\u2060'; // All zero-width chars
                    await sock.sendMessage(posterJid, {
                        react: { text: invisibleCombo, key: msg.key }
                    });
                    console.log(chalk.green(`[STATUS] Invisible combo reaction on ${posterNum}'s status`));
                }
                // ── Normal Auto Like ───────────────────
                else if (autoLike && posterJid) {
                    await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));
                    await sock.sendMessage(posterJid, {
                        react: {
                            text: getVar('STATUS_EMOJI') || randomEmoji(),
                            key:  msg.key
                        }
                    }).catch(() => {});
                    console.log(chalk.magenta(`[STATUS] Liked: ${posterNum}`));
                }

                // ── Auto Save ───────────────────
                await autoSaveStatus(sock, msg);

            } catch {
                // Always silent
            }
        }
    });

    setInterval(() => seen.clear(), 30 * 60 * 1000);
};

function setGhostMode(enabled) {
    ghostMode = enabled;
    console.log(chalk.cyan(`[GHOST] Mode ${enabled ? 'ENABLED' : 'DISABLED'}`));
}

function isGhostMode() {
    return ghostMode;
}

module.exports = { setupStatusHandler, setGhostMode, isGhostMode };
