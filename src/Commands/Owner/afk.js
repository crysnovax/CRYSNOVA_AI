const fs = require('fs');
const path = require('path');

const AFK_FILE = path.join(process.cwd(), 'database', 'afk.json');
const MARKER = '\u200E';

let afkData = {};

const loadAfk = () => {
    try {
        if (fs.existsSync(AFK_FILE)) {
            afkData = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[AFK LOAD]', e.message);
        afkData = {};
    }
};

const saveAfk = () => {
    try {
        fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
    } catch (e) {
        console.error('[AFK SAVE]', e.message);
    }
};

loadAfk();

module.exports = {
    name: 'afk',
    alias: ['away'],
    desc: 'Set AFK with optional reason',
    category: 'Owner',
    usage: '.afk [reason] | .afk off',

    execute: async (sock, m, { args, reply }) => {
        const userId = m.sender;
        const chatId = m.chat;
        const key = `${userId}_${chatId}`;
        const sub = args[0]?.toLowerCase();

        // Turn off
        if (sub === 'off') {
            const wasActive = afkData[key] && afkData[key].enabled;
            if (wasActive) delete afkData[key];
            saveAfk();
            return reply(wasActive ? '`⎙ AFK OFF`' + MARKER : '`✘ You were not AFK`' + MARKER);
        }

        // Turn on with reason
        const reason = args.join(' ') || 'AFK';
        afkData[key] = {
            enabled: true,
            reason: reason,
            timestamp: Date.now(),
            mentions: 0
        };
        saveAfk();

        return reply(`\`⎙ AFK ACTIVE\`\nReason: ${reason}\n_Send any message to turn off.` + MARKER);
    }
};

// ---- Public helper functions ----
module.exports.getAfk = (userId, chatId) => {
    const key = `${userId}_${chatId}`;
    const record = afkData[key];
    return (record && record.enabled === true) ? record : null;
};

module.exports.disableAfk = (userId, chatId) => {
    const key = `${userId}_${chatId}`;
    if (afkData[key]) {
        delete afkData[key];
        saveAfk();
        return true;
    }
    return false;
};

module.exports.incrementMention = (userId, chatId) => {
    const key = `${userId}_${chatId}`;
    if (afkData[key] && afkData[key].enabled) {
        afkData[key].mentions = (afkData[key].mentions || 0) + 1;
        saveAfk();
    }
};

module.exports.getAllAfkUsers = (chatId) => {
    const users = [];
    for (const key in afkData) {
        if (key.endsWith(`_${chatId}`) && afkData[key]?.enabled === true) {
            const userId = key.split('_')[0];
            users.push(userId);
        }
    }
    return users;
};

module.exports.loadAfk = loadAfk;
module.exports.saveAfk = saveAfk;
module.exports.MARKER = MARKER;
