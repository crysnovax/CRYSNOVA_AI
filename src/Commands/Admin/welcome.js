const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../../../database/groupEvents.json');
const readDB = () => { try { return JSON.parse(fs.readFileSync(dbFile)); } catch { return {}; } };
const writeDB = (d) => fs.writeFileSync(dbFile, JSON.stringify(d, null, 2));

module.exports = {
    name: 'setwelcome',
    alias: ['welcome'],
    desc: 'Set welcome message',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply('✐ Usage: _.setwelcome Your welcome text here_\n_Use @user for member name_');
        const db = readDB();
        if (!db[m.chat]) db[m.chat] = {};
        db[m.chat].enabled = true;
        db[m.chat].welcome = text;
        writeDB(db);
        await reply(`—͟͟͞͞𖣘 _*Welcome message set!*_`);
    }
};
