/**
 * CRYSNOVA AI V2 — Auto Status Handler
 * Auto view + auto like — fully independent controls
 */
const { getVar } = require('./configManager');
const chalk      = require('chalk');

const STATUS_EMOJIS = ['❤️‍🔥', '🔥', '💯', '😍', '👏', '✨', '😂', '🥰', '👀', '🎉', '💪', '⚡','📑','🙀','🎉','📝','😢', '❌', '😩', '👾', '🙏', '🤗', '🥏'];
const randomEmoji   = () => STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)];

const seen = new Set();

// Try all known methods to mark a status as viewed
async function markStatusRead(sock, msg) {
    const key = {
        remoteJid:   'status@broadcast',
        id:          msg.key.id,
        participant: msg.key.participant,
        fromMe:      false
    }

    // Method 1: readMessages (standard)
    try {
        await sock.readMessages([key])
    } catch {}

    // Method 2: sendReceipt (Baileys v7+)
    try {
        if (sock.sendReceipt) {
            await sock.sendReceipt(
                'status@broadcast',
                msg.key.participant,
                [msg.key.id],
                'read'
            )
        }
    } catch {}

    // Method 3: sendReadReceipt (some forks)
    try {
        if (sock.sendReadReceipt) {
            await sock.sendReadReceipt(
                'status@broadcast',
                msg.key.participant,
                [msg.key.id]
            )
        }
    } catch {}
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

            } catch {
                // Always silent
            }
        }
    });

    // Flush seen set every 30 min
    setInterval(() => seen.clear(), 30 * 60 * 1000);
};

module.exports = { setupStatusHandler };
