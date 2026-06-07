const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../../../database/groupEvents.json');
const readDB = () => { try { return JSON.parse(fs.readFileSync(dbFile)); } catch { return {}; } };
const writeDB = (d) => fs.writeFileSync(dbFile, JSON.stringify(d, null, 2));

module.exports = {
    name: 'setgoodbye',
    alias: ['goodbye'],
    desc: 'Set goodbye message',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    execute: async (sock, m, { text, reply }) => {
        const content = text || m.quoted?.body || m.quoted?.text || '';
        if (!content) return reply('✐ Usage: _.setgoodbye Your goodbye text here_\n_Use @user for member name_');
        const db = readDB();
        if (!db[m.chat]) db[m.chat] = {};
        db[m.chat].goodbyeEnabled = true;
        db[m.chat].goodbye = content;
        writeDB(db);
        await reply('`Goodbye message set!`', { quoted: m });
    }
};
