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
    const mentions = [];
    let nonJidMentionCount = 0;

    // ── Get contextInfo from all possible message types ──
    const ctxInfo = 
        raw.extendedTextMessage?.contextInfo ||
        raw.conversation?.contextInfo ||  // .hidetag sometimes comes as conversation
        raw.imageMessage?.contextInfo ||
        raw.videoMessage?.contextInfo ||
        raw.documentMessage?.contextInfo ||
        raw.audioMessage?.contextInfo ||
        raw.stickerMessage?.contextInfo ||
        m.msg?.contextInfo;

    // ── @all / Mention Everyone detection ──
    // WhatsApp native @all uses mentionAll flag
    if (ctxInfo?.mentionAll) {
        mentions.push('__ALL__');
    }

    // ── nonJidMentions: hidetag / @all count (THE KEY FIX!) ──
    // Your hidetag uses extendedTextMessage with contextInfo.nonJidMentions
    if (ctxInfo?.nonJidMentions > 0) {
        nonJidMentionCount = ctxInfo.nonJidMentions;
        mentions.push('__NONJID__');
    }

    // ── extendedTextMessage mentionedJid ──
    const ext = raw.extendedTextMessage;
    if (ext?.contextInfo?.mentionedJid?.length) {
        mentions.push(...ext.contextInfo.mentionedJid);
    }

    // ── imageMessage, videoMessage, etc with caption ──
    for (const type of ['imageMessage','videoMessage','documentMessage','audioMessage','stickerMessage']) {
        if (raw[type]?.contextInfo?.mentionedJid?.length) {
            mentions.push(...raw[type].contextInfo.mentionedJid);
        }
    }

    // ── Already serialized by smsg ──
    if (m.mentionedJid?.length) mentions.push(...m.mentionedJid);
    if (m.msg?.contextInfo?.mentionedJid?.length) mentions.push(...m.msg.contextInfo.mentionedJid);

    return { mentions: [...new Set(mentions)], nonJidMentionCount };
}

// Helper to normalize JID
function norm(jid) {
    return (jid || '').replace(/:\d+@/, '@').replace('@lid', '@s.whatsapp.net');
}

// ── Command ────────────────────────────────────────────────────
module.exports = {
    name: 'antitag',
    alias: ['antimention', 'antitagall'],
    desc: 'Prevent mass tagging / @everyone mentions in group',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🛡️', success: '😑' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB();
        const group = m.chat;
        if (!db[group]) db[group] = { enabled: false, action: 'warn', minTags: 2 };

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const cfg = db[group];
            return reply(
                `☠︎︎ *Anti Tag Settings*\n\n` +
                `❏• Status   : ${cfg.enabled ? '😤 ON' : '✘ OFF'}\n` +
                `❏• Action   : ${cfg.action || 'warn'}\n` +
                `❏• Min tags : ${cfg.minTags || 2} mentions to trigger\n\n` +
                `_Hidetag / mass mentions always blocked when ON_\n\n` +
                `Commands:\n` +
                `❏• .antitag on\n• .antitag off\n` +
                `❏• .antitag warn  → delete + warn\n` +
                `❏• .antitag kick  → delete + kick\n` +
                `❏• .antitag min 3 → set minimum mentions`
            );
        }

        if (sub === 'on') {
            db[group].enabled = true;
            saveDB(db);
            return reply(`_*亗 Anti tag*_ _*ON*_\n_*Action:*_ *${db[group].action}*\nMin mentions: *${db[group].minTags}*\n\n_Mass tagging will be deleted_`);
        }
        if (sub === 'off') {
            db[group].enabled = false;
            saveDB(db);
            return reply('_*✘ Anti tag *OFF*◦*_');
        }
        if (sub === 'warn') {
            db[group].action = 'warn';
            saveDB(db);
            return reply('_*ಠ_ಠ Action →*_ *WARN*');
        }
        if (sub === 'kick') {
            db[group].action = 'kick';
            saveDB(db);
            return reply('_*✓ Action →*_ *KICK*');
        }
        if (sub === 'min' && args[1]) {
            const num = parseInt(args[1]);
            if (isNaN(num) || num < 1) return reply('_*ಠ_ಠ Must be a number greater than 0*_');
            db[group].minTags = num;
            saveDB(db);
            return reply(`_*✓ Min mentions →*_ *${num}*`);
        }

        reply('ಠ_ಠ _*Usage: .antitag on | off | warn | kick | min <number>*_');
    }
};

// ── Message Handler ────────────────────────────────────────────
module.exports.handleAntiTag = async function(sock, m) {
    try {
        if (!m.isGroup || m.key?.fromMe) return;

        const db    = loadDB();
        const group = m.chat;
        if (!db[group]?.enabled) return;

        const minTags    = db[group].minTags || 2;
        const action     = db[group].action  || 'warn';
        
        // Get ALL mentions from the message
        const { mentions, nonJidMentionCount } = getMentions(m);
        const hasAllMention = mentions.includes('__ALL__');
        const hasNonJid = mentions.includes('__NONJID__');
        const uniqueMentions = [...new Set(mentions)].filter(m => !m.startsWith('__'));
        const mentionCount = uniqueMentions.length;

        // Get text for hidetag detection
        const text = m.text || m.body || m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const invisibleCount = (text.match(/[\u200e\u200f\u200b\u2060\u061c\ufeff]/g) || []).length;
        const isHideTag = invisibleCount >= 2;

        // Trigger if: @all mention OR nonJidMentions (hidetag/@all) OR hidetag (invisible chars) OR enough mentions
        const shouldTrigger = hasAllMention || hasNonJid || isHideTag || mentionCount >= minTags;

        if (!shouldTrigger) return;

        // Get group metadata
        const meta = await sock.groupMetadata(group).catch(() => null);
        if (!meta) return;

        // Admin exemption - admins are safe
        const admins = meta.participants.filter(p => p.admin).map(p => norm(p.id));
        const senderNorm = norm(m.sender);
        if (admins.includes(senderNorm)) return;

        // Bot exemption - bot is safe
        const botJid = norm(sock.user?.id || '');
        if (senderNorm === botJid) return;

        const sender = m.sender;
        let triggerReason;
        if (hasAllMention) triggerReason = '@all mention';
        else if (hasNonJid) triggerReason = `hidetag (${nonJidMentionCount} non-JID mentions)`;
        else if (isHideTag) triggerReason = 'hidetag (invisible chars)';
        else triggerReason = `${mentionCount} tags (min: ${minTags})`;

        // Delete the message
        await sock.sendMessage(group, { delete: m.key }).catch(() => {});

        if (action === 'warn') {
            await sock.sendMessage(group, {
                text: `_ಠ_ಠ @${sender.split('@')[0]}_ _*Mass tagging is not allowed here!*_\n\n_${triggerReason}_`,
                mentions: [sender]
            });
        }

        if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `_*ಠ_ಠ @${sender.split('@')[0]} was removed for mass tagging!*_\n\n_${triggerReason}_`,
                mentions: [sender]
            });
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
        }

        console.log(`[ANTI TAG] ${action} → ${sender.split('@')[0]} | ${triggerReason}`);

    } catch (err) {
        console.error('[ANTI TAG ERROR]', err.message);
    }
};
