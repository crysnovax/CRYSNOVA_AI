/**
 * ZEE BOT V2 — Auto Status Handler
 * Auto view + auto like every status (Kord AI style)
 */
const { getVar } = require('./configManager');
const chalk      = require('chalk');

const STATUS_EMOJIS = ['❤️', '🔥', '💯', '😍', '👏', '✨', '😂', '🥰', '👀', '🎉', '💪', '⚡'];
const randomEmoji   = () => STATUS_EMOJIS[Math.floor(Math.random() * STATUS_EMOJIS.length)];

const seen = new Set();

const setupStatusHandler = (sock) => {

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            try {
                if (msg.key?.remoteJid !== 'status@broadcast') continue;
                if (!msg.message) continue;

                // Deduplicate so we don't react twice to the same status
                const msgId = msg.key?.id;
                if (msgId && seen.has(msgId)) continue;
                if (msgId) seen.add(msgId);

                const autoView = getVar('AUTO_STATUS_VIEW', true);
                if (!autoView) continue;

                // ── Auto View ──────────────────────────────────
                // Must include participant in the key for Baileys to register the read
                await sock.readMessages([{
                    remoteJid:   'status@broadcast',
                    id:          msg.key.id,
                    participant: msg.key.participant   // ← required, was missing before
                }]).catch(() => {});

                const posterJid = msg.key.participant;
                const posterNum = (posterJid || '').split('@')[0];
                console.log(chalk.green(`[STATUS] 👁️  Viewed: ${posterNum}`));

                // ── Auto Like ──────────────────────────────────
                const autoLike = getVar('AUTO_STATUS_LIKE', true);
                if (!autoLike || !posterJid) continue;

                await new Promise(r => setTimeout(r, 600 + Math.random() * 1200));

                // React must go to the POSTER's JID, not status@broadcast
                await sock.sendMessage(posterJid, {
                    react: {
                        text: getVar('STATUS_EMOJI') || randomEmoji(),
                        key:  msg.key        // key still points at the status message
                    }
                }).catch(() => {});

                console.log(chalk.magenta(`[STATUS] 💖  Liked: ${posterNum}`));

            } catch {
                // Always silent
            }
        }
    });

    // Flush seen set every 30 min to avoid memory leak
    setInterval(() => seen.clear(), 30 * 60 * 1000);
};

module.exports = { setupStatusHandler };
