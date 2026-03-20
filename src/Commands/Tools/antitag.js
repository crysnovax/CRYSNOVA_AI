// ZEE BOT V2 — Anti Tag / Anti Mass Mention
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'antitag.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Extract mentions from ALL possible locations in the raw message
function getMentions(m) {
    const raw = m.message || {};

    // extendedTextMessage (most common for tagall)
    const ext = raw.extendedTextMessage;
    if (ext?.contextInfo?.mentionedJid?.length) return ext.contextInfo.mentionedJid;

    // imageMessage, videoMessage, etc with caption
    for (const type of ['imageMessage','videoMessage','documentMessage','audioMessage','stickerMessage']) {
        if (raw[type]?.contextInfo?.mentionedJid?.length) return raw[type].contextInfo.mentionedJid;
    }

    // Already serialized by smsg
    if (m.mentionedJid?.length) return m.mentionedJid;
    if (m.msg?.contextInfo?.mentionedJid?.length) return m.msg.contextInfo.mentionedJid;

    return [];
}

// Detect hidetag / @all invisible pattern
function isHideTag(m) {
    const text = m.text || m.body || m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    return /\u200e|\u200f|\u200b|\u2060/.test(text);
}

// ── Command ────────────────────────────────────────────────────
module.exports = {
    name: 'antitag',
    alias: ['antimention', 'antitagall'],
    desc: 'Prevent mass tagging / @everyone mentions in group',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🛡️', success: '✅' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB();
        const group = m.chat;
        if (!db[group]) db[group] = { enabled: false, action: 'warn', minTags: 2 };

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const cfg = db[group];
            return reply(
                `🛡️ *Anti Tag Settings*\n\n` +
                `• Status   : ${cfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
                `• Action   : ${cfg.action || 'warn'}\n` +
                `• Min tags : ${cfg.minTags || 2} mentions to trigger\n\n` +
                `_@all / hidetag is always blocked when ON_\n\n` +
                `Commands:\n` +
                `• .antitag on\n• .antitag off\n` +
                `• .antitag warn  → delete + warn\n` +
                `• .antitag kick  → delete + kick\n` +
                `• .antitag min 3 → set minimum mentions`
            );
        }

        if (sub === 'on') {
            db[group].enabled = true;
            saveDB(db);
            return reply(`✅ Anti tag *ON*\nAction: *${db[group].action}*\nMin mentions: *${db[group].minTags}*\n\n_@all / hidetag blocked too_`);
        }
        if (sub === 'off') {
            db[group].enabled = false;
            saveDB(db);
            return reply('❌ Anti tag *OFF*');
        }
        if (sub === 'warn') {
            db[group].action = 'warn';
            saveDB(db);
            return reply('✅ Action → *WARN*');
        }
        if (sub === 'kick') {
            db[group].action = 'kick';
            saveDB(db);
            return reply('✅ Action → *KICK*');
        }
        if (sub === 'min' && args[1]) {
            const num = parseInt(args[1]);
            if (isNaN(num) || num < 1) return reply('❌ Must be a number greater than 0');
            db[group].minTags = num;
            saveDB(db);
            return reply(`✅ Min mentions → *${num}*`);
        }

        reply('Usage: .antitag on | off | warn | kick | min <number>');
    }
};

// ── Message Handler ────────────────────────────────────────────
module.exports.handleAntiTag = async function(sock, m) {
    try {
        if (!m.isGroup || m.key?.fromMe) return;

        const db    = loadDB();
        const group = m.chat;
        if (!db[group]?.enabled) return;

        // DEBUG — remove after testing
        console.log('[ANTITAG DEBUG]', JSON.stringify({
            sender: m.sender,
            text: m.text,
            body: m.body,
            mtype: m.mtype,
            mentionedJid: m.mentionedJid,
            msgKeys: Object.keys(m.message || {}),
            extMentions: m.message?.extendedTextMessage?.contextInfo?.mentionedJid,
            convText: m.message?.conversation,
            extText: m.message?.extendedTextMessage?.text,
        }, null, 2));

        const minTags    = db[group].minTags || 2;
        const action     = db[group].action  || 'warn';
        const mentions   = getMentions(m);
        const hideTag    = isHideTag(m);

        // Trigger if: hidetag OR enough mentions OR message contains @
        const hasAtSign = (m.text || m.body || "").includes("@");
        if (!hideTag && !hasAtSign && mentions.length < minTags) return;

        // Admins are exempt
        const meta = await sock.groupMetadata(group).catch(() => null);
        if (!meta) return;

        const admins     = meta.participants.filter(p => p.admin).map(p => p.id.replace(/:\d+@/, '@'));
        const senderNorm = (m.sender || '').replace(/:\d+@/, '@');
        if (admins.includes(senderNorm)) return;

        const sender = m.sender;

        // Delete immediately
        await sock.sendMessage(group, { delete: m.key }).catch(() => {});

        if (action === 'warn') {
            await sock.sendMessage(group, {
                text: `⚠️ @${sender.split('@')[0]} *Mass tagging / group mention is not allowed here!*`,
                mentions: [sender]
            });
        }

        if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `🚫 @${sender.split('@')[0]} was removed for mass tagging!`,
                mentions: [sender]
            });
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
        }

        console.log(`[ANTI TAG] ${action} → ${sender.split('@')[0]} | mentions: ${mentions.length} | hidetag: ${hideTag}`);

    } catch (err) {
        console.error('[ANTI TAG ERROR]', err.message);
    }
};
