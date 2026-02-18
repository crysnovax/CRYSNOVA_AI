const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../../../database/groupEvents.json');

const readDB = () => {
    if (!fs.existsSync(dbFile)) return {};
    return JSON.parse(fs.readFileSync(dbFile));
};
const writeDB = (data) => fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

module.exports = {
    name: 'antilink',
    alias: ['al'],
    desc: 'Toggle anti-link protection',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    execute: async (sock, m, { args, reply }) => {
        const action = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(action)) return reply('Usage: .antilink on/off');
        const db = readDB();
        if (!db[m.chat]) db[m.chat] = {};
        db[m.chat].enabled = true;
        db[m.chat].antilink = action === 'on';
        writeDB(db);
        await reply(`✓ Anti-link *${action.toUpperCase()}* for this group`);
    }
};
