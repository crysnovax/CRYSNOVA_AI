const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'antilink.json');
const WARN_DB_PATH = path.join(process.cwd(), 'database', 'antilink_warns.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function loadWarns() {
    if (!fs.existsSync(WARN_DB_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(WARN_DB_PATH, 'utf8')); } catch { return {}; }
}

function saveWarns(data) {
    fs.mkdirSync(path.dirname(WARN_DB_PATH), { recursive: true });
    fs.writeFileSync(WARN_DB_PATH, JSON.stringify(data, null, 2));
}

function ensureGroupConfig(db, group) {
    if (!db[group]) {
        db[group] = { enabled: false, action: 'delete', whitelist: [], permit: [] };
    } else {
        if (!db[group].hasOwnProperty('whitelist')) db[group].whitelist = [];
        if (!db[group].hasOwnProperty('permit')) db[group].permit = [];
        if (!db[group].hasOwnProperty('action')) db[group].action = 'delete';
        if (!db[group].hasOwnProperty('enabled')) db[group].enabled = false;
    }
    return db[group];
}

function hasLink(text) {
    return /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me)/i.test(text);
}

function extractUrls(text) {
    const matches = text.match(/https?:\/\/[^\s<>]+/gi);
    return matches || [];
}

function isUrlAllowed(urls, whitelist) {
    if (!whitelist || !whitelist.length) return false;
    return urls.some(url => whitelist.some(allowed => url === allowed));
}

function isPermitted(urls, permitList) {
    if (!permitList || !permitList.length) return false;
    return urls.some(url => permitList.some(permitted =>
        url.toLowerCase().startsWith(permitted.toLowerCase())
    ));
}

module.exports = {
    name: 'antilink',
    alias: ['al'],
    desc: 'Block links, with allow (exact URL), permit (URL prefix), delete/warn/kick actions',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🖇️', success: '🚫' },

    execute: async (sock, m, { args, reply }) => {
        if (!m.isGroup) return reply('`⚉ Group only`');

        const db = loadDB();
        const group = m.chat;
        const cfg = ensureGroupConfig(db, group);
        saveDB(db);

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const whitelist = cfg.whitelist.length ? cfg.whitelist.map(u => `❏ ${u}`).join('\n') : '❏ none';
            const permit = cfg.permit.length ? cfg.permit.map(u => `❏ ${u}`).join('\n') : '❏ none';

            let actionDisplay;
            if (cfg.action === 'delete') actionDisplay = ' ꙰⊕ DELETE';
            else if (cfg.action === 'warn') actionDisplay = '⚠︎ WARN (3x → KICK)';
            else if (cfg.action === 'kick') actionDisplay = 'ಠ_ಠ KICK';

            return reply(
                `🖇️ *AntiLink Settings*\n\n` +
                `• Status : ${cfg.enabled ? '✓ ON' : '✘ OFF'}\n` +
                `• Action : ${actionDisplay}\n\n` +
                `*Allowed (exact link)*:\n${whitelist}\n\n` +
                `*Permit (link starts with)*:\n${permit}\n\n` +
                `Commands:\n` +
                `• .antilink on / off\n` +
                `• .antilink delete / warn / kick\n` +
                `• .antilink allow <full_link>\n` +
                `• .antilink disallow <full_link>\n` +
                `• .antilink permit <url_prefix>\n` +
                `• .antilink unpermit <url_prefix>\n` +
                `• .antilink allowlist / permitlist\n` +
                `• .antilink resetwarn @user`
            );
        }

        if (sub === 'on') {
            cfg.enabled = true;
            saveDB(db);
            let actionText;
            if (cfg.action === 'delete') actionText = ' ꙰⊕ DELETE';
            else if (cfg.action === 'warn') actionText = '⚠︎ WARN (3x → KICK)';
            else if (cfg.action === 'kick') actionText = 'ಠ_ಠ KICK';
            return reply(`亗 *AntiLink Enabled*\nAction: ${actionText}`);
        }
        if (sub === 'off') {
            cfg.enabled = false;
            saveDB(db);
            return reply(`✘ AntiLink *Disabled*`);
        }
        if (sub === 'delete') {
            cfg.action = 'delete';
            saveDB(db);
            return reply(` ꙰⊕ Action → *DELETE* (message deleted)`);
        }
        if (sub === 'warn') {
            cfg.action = 'warn';
            saveDB(db);
            return reply(`⚠︎ Action → *WARN* (3 warns = auto kick)`);
        }
        if (sub === 'kick') {
            cfg.action = 'kick';
            saveDB(db);
            return reply(`ಠ_ಠ Action → *KICK* (immediate removal)`);
        }
        if (sub === 'allow') {
            const url = args[1]?.trim();
            if (!url || !url.startsWith('http')) return reply(`✐ Usage: .antilink allow <full_link>\nExample: .antilink allow https://youtube.com/watch?v=abc123`);
            if (cfg.whitelist.includes(url)) return reply('`✘ Link already allowed.`');
            cfg.whitelist.push(url);
            saveDB(db);
            return reply(`✓ Allowed link:\n❏ ${url}`);
        }
        if (sub === 'disallow') {
            const url = args[1]?.trim();
            if (!url) return reply('`✐ Usage: .antilink disallow <full_link>`');
            const idx = cfg.whitelist.indexOf(url);
            if (idx === -1) return reply('`✘ Link not found in allowlist.`');
            cfg.whitelist.splice(idx, 1);
            saveDB(db);
            return reply(` ꙰ Removed from allowlist:\n❏ ${url}`);
        }
        if (sub === 'permit') {
            const url = args[1]?.trim();
            if (!url || !url.startsWith('http')) return reply(`✐ Usage: .antilink permit <url_prefix>\nExample: .antilink permit https://whatsapp.com/channel`);
            if (cfg.permit.includes(url)) return reply('`✘ URL prefix already permitted.`');
            cfg.permit.push(url);
            saveDB(db);
            return reply(`✓ Permitted prefix:\n❏ ${url}`);
        }
        if (sub === 'unpermit') {
            const url = args.slice(1).join(' ')?.trim();
            if (!url) return reply('`✐ Usage: .antilink unpermit <url_prefix>`');
            const idx = cfg.permit.findIndex(p => p === url);
            if (idx === -1) return reply('`✘ Prefix not found in permit list.`');
            const removed = cfg.permit.splice(idx, 1);
            saveDB(db);
            return reply(` ꙰ Removed from permit:\n❏ ${removed[0]}`);
        }
        if (sub === 'allowlist') {
            if (!cfg.whitelist.length) return reply(`❏ No allowed links.`);
            let text = `✓ *Allowed links (exact match)*:\n`;
            text += cfg.whitelist.map(u => `❏ ${u}`).join('\n');
            return reply(text);
        }
        if (sub === 'permitlist') {
            if (!cfg.permit.length) return reply(`❏ No permitted prefixes.`);
            let text = `✓ *Permitted prefixes (starts with)*:\n`;
            text += cfg.permit.map(u => `❏ ${u}`).join('\n');
            return reply(text);
        }
        if (sub === 'resetwarn') {
            const mentioned = m.mentionedJid?.[0];
            if (!mentioned) return reply('`✐ Usage: .antilink resetwarn @user`');
            const warns = loadWarns();
            const key = `${group}_${mentioned}`;
            if (warns[key]) {
                delete warns[key];
                saveWarns(warns);
                return reply(`✓ Warnings reset for @${mentioned.split('@')[0]}`, { mentions: [mentioned] });
            }
            return reply('`✘ User has no warnings.`');
        }

        return reply(`𒆜 Usage:\n.antilink on/off\n.antilink delete/warn/kick\n.antilink allow <full_link>\n.antilink disallow <full_link>\n.antilink permit <url_prefix>\n.antilink unpermit <url_prefix>\n.antilink allowlist/permitlist\n.antilink resetwarn @user`);
    }
};

// ── Message Handler ──────────────────────────────────────────────
module.exports.handleAntiLink = async function(sock, m) {
    try {
        if (!m.isGroup) return;
        if (m.key?.fromMe) return;

        const db = loadDB();
        const group = m.chat;
        if (!db[group]) return;

        const cfg = db[group];
        if (!cfg.enabled) return;

        // ── Extract text from ALL message types + extendedTextMessage fix ──
        const msg = m.message || {};

        const parts = [
            m.text,
            m.body,
            msg.conversation,
            msg.extendedTextMessage?.text,
            msg.extendedTextMessage?.matchedText,  // ← URL embedded in rich-text messages
            msg.imageMessage?.caption,
            msg.videoMessage?.caption,
            msg.documentMessage?.caption,
            msg.audioMessage?.caption,
        ].filter(Boolean);

        const text = parts.join(' ');

        if (!text) return;
        if (!hasLink(text)) return;

        const urls = extractUrls(text);

        // Check allowlist (exact URL match)
        if (cfg.whitelist && cfg.whitelist.length && isUrlAllowed(urls, cfg.whitelist)) return;

        // Check permit list (URL starts with prefix)
        if (cfg.permit && cfg.permit.length && isPermitted(urls, cfg.permit)) return;

        const meta = await sock.groupMetadata(group).catch(() => null);
        if (!meta) return;

        const sender = m.sender;
        if (!sender) return;

        const senderNorm = sender.replace(/:\d+@/, '@');
        const admins = meta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id.replace(/:\d+@/, '@'));
        if (admins.includes(senderNorm)) return;

        const action = cfg.action || 'delete';

        // Delete the message FIRST for all actions
        await sock.sendMessage(group, { delete: m.key }).catch(() => {});

        if (action === 'delete') {
            await sock.sendMessage(group, {
                text: `ⓘ @${sender.split('@')[0]} *Link detected!*\nLinks are not allowed here. Message deleted. ಥ⁠‿⁠ಥ`,
                mentions: [sender]
            }).catch(() => {});
        }
        else if (action === 'warn') {
            const warns = loadWarns();
            const warnKey = `${group}_${sender}`;

            if (!warns[warnKey]) {
                warns[warnKey] = { count: 0, user: sender };
            }
            warns[warnKey].count++;
            saveWarns(warns);

            const warnCount = warns[warnKey].count;
        //    console.log(`[ANTILINK WARN] ${sender.split('@')[0]} now has ${warnCount}/3 warnings`);

            if (warnCount >= 3) {
                delete warns[warnKey];
                saveWarns(warns);

                await sock.sendMessage(group, {
                    text: `ಠ_ಠ @${sender.split('@')[0]} *KICKED*\n3/3 warnings - Sent a link.`,
                    mentions: [sender]
                }).catch(() => {});

                await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
            } else {
                await sock.sendMessage(group, {
                    text: `⚠︎ @${sender.split('@')[0]} *Warning ${warnCount}/3*\nLinks are not allowed. ${3 - warnCount} more = kick! ಥ⁠‿⁠ಥ`,
                    mentions: [sender]
                }).catch(() => {});
            }
        }
        else if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `ಠ_ಠ @${sender.split('@')[0]} *KICKED* for sending a link.`,
                mentions: [sender]
            }).catch(() => {});

            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
        }

    //    console.log(`[ANTILINK] ${action} → ${sender.split('@')[0]} | urls: ${urls.join(', ')}`);
    } catch (err) {
        console.error('[ANTILINK ERROR]', err.message);
    }
};
