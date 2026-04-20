// ZEE BOT V2 — Anti Spam
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'antispam.json');

// Spam tracking cache (in-memory, cleared on restart)
const messageCache = new Map(); // group: { userId: { count, firstTime, lastTime, warned } }
const MUTE_CACHE = new Map(); // Muted users with expiry

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Helper to normalize JID
function norm(jid) {
    return (jid || '').replace(/:\d+@/, '@').replace('@lid', '@s.whatsapp.net');
}

// ── Command ────────────────────────────────────────────────────
module.exports = {
    name: 'antispam',
    alias: ['antispam', 'spam'],
    desc: 'Prevent spam / message flooding in group',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🚫', success: '🤖' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB();
        const group = m.chat;
        if (!db[group]) {
            db[group] = {
                enabled: false,
                action: 'warn',
                maxMessages: 5,
                timeWindow: 5000, // 5 seconds
                muteDuration: 60000 // 1 minute
            };
        }

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const cfg = db[group];
            return reply(
                `🚫 *Anti Spam Settings*\n\n` +
                `• Status    : ${cfg.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
                `• Action    : ${cfg.action || 'warn'}\n` +
                `• Max msgs  : ${cfg.maxMessages || 5}\n` +
                `• Time window : ${(cfg.timeWindow || 5000) / 1000}s\n` +
                `• Mute duration : ${(cfg.muteDuration || 60000) / 1000}s\n\n` +
                `Commands:\n` +
                `• .antispam on\n• .antispam off\n` +
                `• .antispam warn\n• .antispam kick\n• .antispam mute\n` +
                `• .antispam max <number>\n• .antispam time <seconds>\n` +
                `• .antispam duration <seconds>`
            );
        }

        if (sub === 'on') {
            db[group].enabled = true;
            saveDB(db);
            return reply(`_*🚫 Anti Spam ON*_\n_Max ${db[group].maxMessages} msgs in ${db[group].timeWindow / 1000}s_`);
        }
        if (sub === 'off') {
            db[group].enabled = false;
            saveDB(db);
            return reply('_*✓ Anti Spam OFF*_');
        }
        if (sub === 'warn') {
            db[group].action = 'warn';
            saveDB(db);
            return reply('_*✓ Action → WARN*_');
        }
        if (sub === 'kick') {
            db[group].action = 'kick';
            saveDB(db);
            return reply('_*✓ Action → KICK*_');
        }
        if (sub === 'mute') {
            db[group].action = 'mute';
            saveDB(db);
            return reply('_*✓ Action → MUTE*_');
        }
        if (sub === 'max' && args[1]) {
            const num = parseInt(args[1]);
            if (isNaN(num) || num < 2) return reply('_*Must be at least 2 messages*_');
            db[group].maxMessages = num;
            saveDB(db);
            return reply(`_*✓ Max messages → ${num}*_`);
        }
        if (sub === 'time' && args[1]) {
            const secs = parseInt(args[1]);
            if (isNaN(secs) || secs < 2) return reply('_*Must be at least 2 seconds*_');
            db[group].timeWindow = secs * 1000;
            saveDB(db);
            return reply(`_*✓ Time window → ${secs}s*_`);
        }
        if (sub === 'duration' && args[1]) {
            const secs = parseInt(args[1]);
            if (isNaN(secs) || secs < 5) return reply('_*Must be at least 5 seconds*_');
            db[group].muteDuration = secs * 1000;
            saveDB(db);
            return reply(`_*✓ Mute duration → ${secs}s*_`);
        }

        reply('ಠ_ಠ _*Usage: .antispam on | off | warn | kick | mute | max <n> | time <s> | duration <s>*_');
    }
};

// ── Message Handler ────────────────────────────────────────────
module.exports.handleAntiSpam = async function(sock, m) {
    try {
        if (!m.isGroup || m.key?.fromMe) return;

        const db    = loadDB();
        const group = m.chat;
        if (!db[group]?.enabled) return;

        const sender = m.sender;
        const now = Date.now();

        // Check if user is muted
        const muteKey = `${group}:${sender}`;
        const muteExpiry = MUTE_CACHE.get(muteKey);
        if (muteExpiry && now < muteExpiry) {
            // User is muted - delete their message
            await sock.sendMessage(group, { delete: m.key }).catch(() => {});
            console.log(`[ANTI SPAM] Muted user message deleted: ${sender.split('@')[0]}`);
            return;
        }

        // Get group config
        const maxMessages = db[group].maxMessages || 5;
        const timeWindow = db[group].timeWindow || 5000;
        const action = db[group].action || 'warn';
        const muteDuration = db[group].muteDuration || 60000;

        // Get or create group cache
        if (!messageCache.has(group)) {
            messageCache.set(group, new Map());
        }
        const groupCache = messageCache.get(group);

        // Get or create user data
        if (!groupCache.has(sender)) {
            groupCache.set(sender, { count: 0, firstTime: now, lastTime: now, warned: false });
        }
        const userData = groupCache.get(sender);

        // Reset if time window expired
        if (now - userData.firstTime > timeWindow) {
            userData.count = 0;
            userData.firstTime = now;
            userData.warned = false;
        }

        // Increment message count
        userData.count++;
        userData.lastTime = now;

        // Check if spam threshold reached
        if (userData.count >= maxMessages) {
            // Check admin exemption
            const meta = await sock.groupMetadata(group).catch(() => null);
            if (meta) {
                const admins = meta.participants.filter(p => p.admin).map(p => norm(p.id));
                const senderNorm = norm(sender);
                if (admins.includes(senderNorm)) {
                    // Admin exempt - reset count
                    userData.count = 0;
                    return;
                }
            }

            // Delete the spam messages (last few)
            // Note: Can't delete all, just the current one
            await sock.sendMessage(group, { delete: m.key }).catch(() => {});

            const senderTag = `@${sender.split('@')[0]}`;

            if (action === 'warn' && !userData.warned) {
                userData.warned = true;
                await sock.sendMessage(group, {
                    text: `_*🚫 @${sender.split('@')[0]}*_ _*STOP SPAMMING!*_\n\n_${userData.count} messages in ${timeWindow / 1000}s_\n_This is a warning._`,
                    mentions: [sender]
                });
                console.log(`[ANTI SPAM] Warned: ${sender.split('@')[0]} | ${userData.count} msgs`);
            }

            if (action === 'mute') {
                const expiry = now + muteDuration;
                MUTE_CACHE.set(muteKey, expiry);
                
                await sock.sendMessage(group, {
                    text: `_*🔇 @${sender.split('@')[0]} has been muted for spamming!*_\n\n_${userData.count} messages in ${timeWindow / 1000}s_\n_Muted for ${muteDuration / 1000}s_`,
                    mentions: [sender]
                });
                
                // Schedule unmute
                setTimeout(() => {
                    MUTE_CACHE.delete(muteKey);
                    sock.sendMessage(group, { text: `_*🔊 @${sender.split('@')[0]} has been unmuted.*_`, mentions: [sender] }).catch(() => {});
                }, muteDuration);
                
                userData.count = 0;
                console.log(`[ANTI SPAM] Muted: ${sender.split('@')[0]} for ${muteDuration / 1000}s`);
            }

            if (action === 'kick') {
                await sock.sendMessage(group, {
                    text: `_*👢 @${sender.split('@')[0]} was kicked for spamming!*_\n\n_${userData.count} messages in ${timeWindow / 1000}s_`,
                    mentions: [sender]
                });
                await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
                
                // Remove from cache
                groupCache.delete(sender);
                console.log(`[ANTI SPAM] Kicked: ${sender.split('@')[0]}`);
            }

            // Reset count after action
            userData.count = 0;
            userData.firstTime = now;
        }

        // Clean up old entries (every 100 messages)
        if (Math.random() < 0.01) {
            for (const [uid, data] of groupCache.entries()) {
                if (now - data.lastTime > timeWindow * 2) {
                    groupCache.delete(uid);
                }
            }
        }

    } catch (err) {
        console.error('[ANTI SPAM ERROR]', err.message);
    }
};

// ─── Helper to check if user is muted (for other commands) ───
module.exports.isMuted = function(group, user) {
    const muteKey = `${group}:${user}`;
    const expiry = MUTE_CACHE.get(muteKey);
    return expiry && Date.now() < expiry;
};

// ─── Helper to manually unmute ───
module.exports.unmute = function(group, user) {
    const muteKey = `${group}:${user}`;
    return MUTE_CACHE.delete(muteKey);
};

// ─── Helper to manually mute ───
module.exports.mute = function(group, user, duration) {
    const muteKey = `${group}:${user}`;
    MUTE_CACHE.set(muteKey, Date.now() + duration);
};
