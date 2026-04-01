const fs = require('fs');
const path = require('path');

const STICKER_CMD_FILE = path.join(__dirname, '../../../database/sticker_cmds.json');

// Load fresh data every time to ensure sync
const loadFresh = () => {
    try {
        if (fs.existsSync(STICKER_CMD_FILE)) {
            return JSON.parse(fs.readFileSync(STICKER_CMD_FILE, 'utf8'));
        }
    } catch {}
    return {};
};

// Save and sync to setcmd's exported object
const saveAndSync = (data) => {
    try {
        fs.writeFileSync(STICKER_CMD_FILE, JSON.stringify(data, null, 2));
        
        // Sync to setcmd's exported stickerCmds
        const setcmd = require('./setcmd.js');
        Object.keys(setcmd.stickerCmds).forEach(k => delete setcmd.stickerCmds[k]);
        Object.assign(setcmd.stickerCmds, data);
        
    } catch {}
};

module.exports = {
    name: 'delcmd',
    alias: ['uncmd', 'unbind'],
    desc: 'Unbind command from sticker',
    category: 'owner',
    ownerOnly: true,
    usage: '.delcmd (reply to sticker)',

    execute: async (sock, m, { reply }) => {
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerData = quotedMsg?.stickerMessage;
        
        if (!stickerData) {
            return reply('╭─❍ *DELCMD*\n│\n│ ✘ Reply to a bound sticker\n╰──────────────────');
        }

        const fileSha256 = stickerData.fileSha256;
        if (!fileSha256) {
            return reply('╭─❍ *DELCMD*\n│\n│ ✘ Could not get sticker hash\n╰──────────────────');
        }

        const hash = Buffer.isBuffer(fileSha256) 
            ? fileSha256.toString('hex') 
            : String(fileSha256);

        // Load fresh data from disk
        const stickerCmds = loadFresh();

        if (!stickerCmds[hash]) {
            return reply('╭─❍ *DELCMD*\n│\n│ ✘ This sticker has no bound command\n╰──────────────────');
        }

        const removedCmd = stickerCmds[hash].split(/\s+/)[0];
        delete stickerCmds[hash];
        
        // Save to disk AND sync to setcmd's memory
        saveAndSync(stickerCmds);

        return reply(
            `╭─❍ *亗 UNBOUND*\n│\n│ ⚉ Hash : ${hash.substring(0, 8)}...\n│ 𓄄 Cmd  : *${removedCmd}*\n│ ✦ Status : REMOVED\n╰──────────────────`
        );
    }
};
