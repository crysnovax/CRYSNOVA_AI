/**
 * CRYSNOVA AI V2 — Auto Status Handler
 * Auto like + Auto Save
 */
const { getVar } = require('./configManager');
const chalk      = require('chalk');
const fs         = require('fs');
const path       = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const seen = new Set();

// ── AUTO SAVE CONFIG ──────────────────────────────────────────────
const ASS_CONFIG_PATH = path.join(process.cwd(), 'database', 'autosavestatus.json');
const defaultAssConfig = { enabled: false, mode: 'dm', target: null };

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

// ── AUTO SAVE STATUS ──────────────────────────────────────────────
async function autoSaveStatus(sock, msg) {
    const config = getAssConfig();
    if (!config.enabled) return;

    const targetJid = config.mode === 'dm' ? getOwnerJid() : config.target;
    if (!targetJid) return;

    const message = msg.message;
    if (!message) return;

    const type = Object.keys(message).find(key =>
        ['imageMessage', 'videoMessage', 'audioMessage'].includes(key)
    );
    if (!type) return;

    try {
        const mediaMsg = message[type];
        const stream   = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
        let buffer     = Buffer.alloc(0);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const caption  = mediaMsg?.caption || '';
        const sendType = type === 'videoMessage' ? 'video' : type === 'imageMessage' ? 'image' : 'audio';

        await sock.sendMessage(targetJid, {
            [sendType]: buffer,
            ...(caption ? { caption } : {}),
            ...(sendType === 'audio' ? { mimetype: 'audio/mpeg', ptt: false } : {})
        });

        const posterNum = (msg.key.participant || '').split('@')[0];
        console.log(chalk.cyan(`[ASS] Saved from ${posterNum} → ${targetJid.split('@')[0]}`));
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

                const msgId = msg.key?.id;
                if (msgId && seen.has(msgId)) continue;
                if (msgId) seen.add(msgId);

                const posterJid = msg.key.participant;
                const posterNum = (posterJid || '').split('@')[0];
                const reactJid  = msg.key.remoteJidAlt || posterJid;

                const autoLike  = getVar('AUTO_STATUS_LIKE', true);

                // ── Auto Like ─────────────────────────────────
                if (autoLike && reactJid) {
                    await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));

                    await sock.sendMessage(
                        'status@broadcast',
                        {
                            react: {
                                text: '💚',
                                key:  msg.key
                            }
                        },
                        {
                            statusJidList: [reactJid]
                        }
                    ).catch((err) => {
                        console.log(chalk.red(`[STATUS] Like failed: ${err.message}`));
                    });

                    console.log(chalk.magenta(`[STATUS] Liked: ${reactJid.split('@')[0]}`));
                }

                // ── Auto Save ─────────────────────────────────
                await autoSaveStatus(sock, msg);

            } catch {
                // Always silent
            }
        }
    });

    setInterval(() => seen.clear(), 30 * 60 * 1000);
};

module.exports = { setupStatusHandler };
