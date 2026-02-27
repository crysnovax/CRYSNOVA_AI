const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'antilink.json');

// Load DB
function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

// Save DB
function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Link detection
function hasLink(text) {
    return /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me)/i.test(text);
}

module.exports = {
    name: 'antilink',
    alias: ['al'],
    category: 'admin',
     // ⭐ Reaction config
    reactions: {
        start: '🖇️',
        success: '🚫'
    },
    

    execute: async (sock, m, { args, reply }) => {

        if (!m.isGroup) return reply('⚉ Group only');

        const db = loadDB();
        const group = m.chat;

        if (!db[group]) db[group] = { enabled: false };

        const cmd = args[0]?.toLowerCase();

        if (!cmd) {
            const status = db[group].enabled ? "ON" : "OFF";
            return reply(`✪ AntiLink Status: ${status}\n\nUse .antilink on/off`);
        }

        if (cmd === 'on') {
            db[group].enabled = true;
            saveDB(db);
            return reply('亗 `AntiLink Enabled`');
        }

        if (cmd === 'off') {
            db[group].enabled = false;
            saveDB(db);
            return reply('✘ _*AntiLink Disabled*_');
        }

        reply('⚉ Usage: .antilink on/off');
    }
};

// ⭐ Message Handler (MOST IMPORTANT PART)

module.exports.handleAntiLink = async function(sock, m) {

    try {

        if (!m.isGroup || m.key.fromMe) return;

        const db = loadDB();
        const group = m.chat;

        if (!db[group]?.enabled) return;

        const text = m.text || "";

        if (!hasLink(text)) return;

        const meta = await sock.groupMetadata(group);

        const sender = m.sender;

        const isAdmin = meta.participants.some(p =>
            p.id === sender &&
            (p.admin === "admin" || p.admin === "superadmin")
        );

        if (isAdmin) return;

        await sock.sendMessage(group, { delete: m.key });

        await sock.sendMessage(group, {
            text: `⚉ *Link detected*!\n@${sender.split('@')[0]}_*Links are strictly not allowed here*_`,
            mentions: [sender]
        });

    } catch (err) {
        console.error("[ANTILINK ERROR]", err.message);
    }
};
