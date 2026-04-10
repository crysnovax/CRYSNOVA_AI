/**
 * CRYSNOVA AI V2 — Auto Status Handler
 * Auto view + auto like + auto save — fully independent controls
 */
const { getVar } = require('./configManager');
const chalk      = require('chalk');
const fs         = require('fs');
const path       = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const STATUS_EMOJIS = ['❤️‍🔥', '🔥', '💯', '😍', '👏', '✨', '😂', '🥰', '👀', '🎉', '💪', '⚡','📑','🙀','🎉','📝','😢', '❌', '😩', '👾', '🙏', '🤗', '🥏'];
const randomEmoji   = () => STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)];

const seen = new Set();

// ─── ASS CONFIG ─────────────────────────────────────────────────
const ASS_CONFIG_PATH = path.join(process.cwd(), 'database', 'autosavestatus.json');
const defaultAssConfig = {
    enabled: false,
    mode: 'dm',        // 'dm' = owner DM, 'chat' = specific chat, 'number' = specific WhatsApp number
    target: null,      // JID for chat mode, or phone number string for number mode
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

// Try all known methods to mark a status as viewed
async function markStatusRead(sock, msg) {
    const key = {
        remoteJid:   'status@broadcast',
        id:          msg.key.id,
        participant: msg.key.participant,
        fromMe:      false
    }

    try { await sock.readMessages([key]) } catch {}
    try { if (sock.sendReceipt) await sock.sendReceipt('status@broadcast', msg.key.participant, [msg.key.id], 'read') } catch {}
    try { if (sock.sendReadReceipt) await sock.sendReadReceipt('status@broadcast', msg.key.participant, [msg.key.id]) } catch {}
}

// ─── Auto Save Status ──────────────────────────────────────────
async function autoSaveStatus(sock, msg) {
    const config = getAssConfig();
    if (!config.enabled) return;

    // Determine target JID
    let targetJid;
    if (config.mode === 'dm') {
        targetJid = getOwnerJid();
    } else if (config.mode === 'number' || config.mode === 'chat') {
        targetJid = config.target;
    }
    if (!targetJid) return;

    const message = msg.message;
    if (!message) return;

    // Find the media type
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

const setupStatusHandler = (sock) => {

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            try {
                if (msg.key?.remoteJid !== 'status@broadcast') continue;
                if (!msg.message) continue;

                // Deduplicate
                const msgId = msg.key?.id;
                if (msgId && seen.has(msgId)) continue;
                if (msgId) seen.add(msgId);

                const posterJid = msg.key.participant;
                const posterNum = (posterJid || '').split('@')[0];

                const autoView = getVar('AUTO_STATUS_VIEW', true);
                const autoLike = getVar('AUTO_STATUS_LIKE', true);

                // ── Auto View — independent ───────────────────
                if (autoView) {
                    await markStatusRead(sock, msg);
                    console.log(chalk.green(`[STATUS] Viewed: ${posterNum}`));
                }

                // ── Auto Like — independent ───────────────────
                if (autoLike && posterJid) {
                    await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));
                    await sock.sendMessage(posterJid, {
                        react: {
                            text: getVar('STATUS_EMOJI') || randomEmoji(),
                            key:  msg.key
                        }
                    }).catch(() => {});
                    console.log(chalk.magenta(`[STATUS] Liked: ${posterNum}`));
                }

                // ── Auto Save Status (ASS) ────────────────────
                await autoSaveStatus(sock, msg);

            } catch {
                // Always silent
            }
        }
    });

    // Flush seen set every 30 min
    setInterval(() => seen.clear(), 30 * 60 * 1000);
};

module.exports = { setupStatusHandler };
    
