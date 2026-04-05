const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'antilink.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return {}; }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function ensureGroupConfig(db, group) {
    if (!db[group]) {
        db[group] = { enabled: false, action: 'warn', whitelist: [], permit: [] };
    } else {
        if (!db[group].hasOwnProperty('whitelist')) db[group].whitelist = [];
        if (!db[group].hasOwnProperty('permit')) db[group].permit = [];
        if (!db[group].hasOwnProperty('action')) db[group].action = 'warn';
        if (!db[group].hasOwnProperty('enabled')) db[group].enabled = false;
    }
    return db[group];
}

function hasLink(text) {
    return /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me)/i.test(text);
}

function extractDomains(text) {
    const matches = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+)\.[a-z]{2,}(?:\/|$)/gi);
    if (!matches) return [];
    return matches.map(m => {
        let domain = m.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
        return domain;
    });
}

function extractUrls(text) {
    const matches = text.match(/https?:\/\/[^\s<>]+/gi);
    return matches ? matches.map(u => u.toLowerCase()) : []; // lowercased for matching
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
    desc: 'Block links, with whitelist (domain), permit (full URL), and warn/kick actions',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🖇️', success: '🚫' },

    execute: async (sock, m, { args, reply }) => {
        if (!m.isGroup) return reply('⚉ Group only');

        const db = loadDB();
        const group = m.chat;
        const cfg = ensureGroupConfig(db, group);
        saveDB(db);

        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const whitelist = cfg.whitelist.length ? cfg.whitelist.map(d => `❏ ${d}`).join('\n') : '❏ none';
            const permit = cfg.permit.length ? cfg.permit.map(u => `❏ ${u}`).join('\n') : '❏ none';
            return reply(
                `🖇️ *AntiLink Settings*\n\n` +
                `• Status : ${cfg.enabled ? '✓ ON' : '✘ OFF'}\n` +
                `• Action : ${cfg.action === 'warn' ? '⚠︎ WARN' : 'ಠ_ಠ KICK'}\n\n` +
                `*Whitelist (domain)*:\n${whitelist}\n\n` +
                `*Permit (full URL)*:\n${permit}\n\n` +
                `Commands:\n` +
                `• .antilink on / off\n` +
                `• .antilink warn / kick\n` +
                `• .antilink add <domain>\n` +
                `• .antilink remove <domain>\n` +
                `• .antilink permit <url>\n` +
                `• .antilink unpermit <url>\n` +
                `• .antilink list / permitlist`
            );
        }

        if (sub === 'on') {
            cfg.enabled = true;
            saveDB(db);
            return reply(`亗 *AntiLink Enabled*\nAction: ${cfg.action === 'warn' ? '⚠︎ WARN' : '㉨⁠ KICK'}`);
        }
        if (sub === 'off') {
            cfg.enabled = false;
            saveDB(db);
            return reply(`✘ AntiLink *Disabled*`);
        }
        if (sub === 'warn') {
            cfg.action = 'warn';
            saveDB(db);
            return reply(`⚠︎ Action → *WARN* (delete + warn)`);
        }
        if (sub === 'kick') {
            cfg.action = 'kick';
            saveDB(db);
            return reply(`⌘ Action → *KICK* (delete + kick)`);
        }
        if (sub === 'add') {
            const domain = args[1]?.toLowerCase();
            if (!domain) return reply(`✐ Usage: .antilink add <domain>\nExample: .antilink add youtube.com`);
            if (cfg.whitelist.includes(domain)) return reply(`✘ "${domain}" already whitelisted.`);
            cfg.whitelist.push(domain);
            saveDB(db);
            return reply(`✓ Added to whitelist: ❏ ${domain}`);
        }
        if (sub === 'remove') {
            const domain = args[1]?.toLowerCase();
            if (!domain) return reply(`✐ Usage: .antilink remove <domain>`);
            const idx = cfg.whitelist.indexOf(domain);
            if (idx === -1) return reply(`✘ "${domain}" not in whitelist.`);
            cfg.whitelist.splice(idx, 1);
            saveDB(db);
            return reply(`🗑️ Removed from whitelist: ❏ ${domain}`);
        }
        if (sub === 'permit') {
            const url = args[1]?.trim(); // ✅ No toLowerCase()
            if (!url || !url.startsWith('http')) return reply(`✐ Usage: .antilink permit <full_url>\nExample: .antilink permit https://whatsapp.com/channel/xxx`);
            if (cfg.permit.includes(url)) return reply(`✘ URL already permitted.`);
            cfg.permit.push(url);
            saveDB(db);
            return reply(`✓ Permitted URL:\n❏ ${url}`);
        }
        if (sub === 'unpermit') {
            const url = args.slice(1).join(' ')?.trim();
            if (!url) return reply(`✐ Usage: .antilink unpermit <url>`);
            const idx = cfg.permit.findIndex(p => p.toLowerCase() === url.toLowerCase());
            if (idx === -1) return reply(`✘ URL not found in permit list.`);
            const removed = cfg.permit.splice(idx, 1);
            saveDB(db);
            return reply(`🗑️ Removed from permit:\n❏ ${removed[0]}`);
        }
        if (sub === 'list') {
            if (!cfg.whitelist.length) return reply(`❏ No whitelisted domains.`);
            let text = `✓ *Whitelisted domains:*\n`;
            text += cfg.whitelist.map(d => `❏ ${d}`).join('\n');
            return reply(text);
        }
        if (sub === 'permitlist') {
            if (!cfg.permit.length) return reply(`❏ No permitted URLs.`);
            let text = `✓ *Permitted URLs:*\n`;
            text += cfg.permit.map(u => `❏ ${u}`).join('\n');
            return reply(text);
        }
        return reply(`𒆜 Usage:\n.antilink on/off\n.antilink warn/kick\n.antilink add <domain>\n.antilink remove <domain>\n.antilink permit <url>\n.antilink unpermit <url>\n.antilink list\n.antilink permitlist`);
    }
};

// ── Message Handler (with case‑insensitive permit) ───────────────
module.exports.handleAntiLink = async function(sock, m) {
    try {
        if (!m.isGroup) return;
        if (m.key?.fromMe) return;

        const db = loadDB();
        const group = m.chat;
        if (!db[group]) return;
        
        const cfg = db[group];
        if (!cfg.enabled) return;

        const text = m.text || m.body || '';
        if (!text) return;
        if (!hasLink(text)) return;

        const domains = extractDomains(text);
        const urls = extractUrls(text); // these are lowercased

        // Permit list (case‑insensitive)
        if (cfg.permit && cfg.permit.length && isPermitted(urls, cfg.permit)) return;

        // Whitelist (domain, already lowercased)
        let isWhitelisted = false;
        if (domains.length && cfg.whitelist && cfg.whitelist.length) {
            isWhitelisted = domains.some(dom => cfg.whitelist.includes(dom));
        }
        if (isWhitelisted) return;

        const meta = await sock.groupMetadata(group).catch(() => null);
        if (!meta) return;

        const sender = m.sender;
        const senderNorm = (sender || '').replace(/:\d+@/, '@');
        const admins = meta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id.replace(/:\d+@/, '@'));
        if (admins.includes(senderNorm)) return;

        const action = cfg.action || 'warn';

        await sock.sendMessage(group, { delete: m.key }).catch(() => {});

        if (action === 'warn') {
            await sock.sendMessage(group, {
                text: `ⓘ @${sender.split('@')[0]} *Link detected!* \nLinks are not allowed here. Your message was deleted. ಥ⁠‿⁠ಥ`,
                mentions: [sender]
            }).catch(() => {});
        } else if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `⚠︎ @${sender.split('@')[0]} *was removed* for sending a link. ಠ_ಠ`,
                mentions: [sender]
            }).catch(() => {});
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {});
        }

        console.log(`[ANTILINK] ${action} → ${sender.split('@')[0]} | urls: ${urls.join(',')}`);
    } catch (err) {
        console.error('[ANTILINK ERROR]', err.message);
    }
};
