// © 2026 CRYSNOVA AI V2.0 - All Rights Reserved.
// Auto-loads from user-config.json (created during first setup)

const fs = require('fs');
const path = require('path');

const USER_CONFIG_PATH = path.join(__dirname, '../database/user-config.json');

// ── Load User Configuration (from setup wizard) ────────────
let userConfig = null;
if (fs.existsSync(USER_CONFIG_PATH)) {
    try {
        userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    } catch (err) {
        console.error('Error loading user config:', err.message);
    }
}

// ── Build Config (uses userConfig if available, else defaults) ──
const config = {
    // Owner details (from setup or defaults)
    owner:      userConfig?.owner?.number || "2348077528901",
    botNumber:  userConfig?.owner?.number || "2348077528901",
    
    session: "sessions",
    thumbUrl: "https://i.ibb.co/pBrzZDQj/20260212-111751.jpg",
    
    status: {
        public:   userConfig?.bot?.public !== undefined ? userConfig.bot.public : false,
        terminal: true,
        reactsw:  true
    },
    
    message: {
        owner:   "no, this is for owners only by crysnova ☠️",
        group:   "this is for groups only by crysnova ☠️",
        admin:   "this command is for admin only by crysnova ☠️",
        private: "this is specifically for private chat by crysnova ☠️"
    },
    
    mess: {
        owner: 'This command is only for the bot owner! by crysnova ☠️',
        done:  'Mode changed successfully! ✓𓄄',
        error: 'Something went wrong!✘𓄄',
        wait:  'Please wait...⚉'
    },
    
    settings: {
        title:       userConfig?.bot?.name    || "CRYSN⚉VA AI V2",
        packname:    userConfig?.bot?.name    || "CRYSNOVA",
        prefix:      userConfig?.bot?.prefix  || ".",
        description: "Professional WhatsApp Bot - CRYSNOVA AI V2.0",
        author:      'https://github.com/crysnovax/CRYSNOVA_AI',
        footer:      "𝗖𝗥𝗬𝗦𝗡𝗢𝗩𝗔: @crysnovax",
        ownerJid:    userConfig?.owner?.jid   || "2348077528901@s.whatsapp.net",
        ownerName:   userConfig?.owner?.name  || "CRYSNOVA"
    },
    
    newsletter: {
        name: userConfig?.bot?.name || "CRYSNOVA AI V2",
        id:   "0@newsletter"
    },
    
    api: {
        baseurl: "https://hector-api.vercel.app/",
        apikey:  "hector",
        groq:    process.env.GROQ_API_KEY || ""
    },
    
    sticker: {
        packname: userConfig?.bot?.name || "CRYSNOVA AI V2",
        author:   "CRYSN⚉VA"
    }
};

module.exports = config;

// Hot reload
let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});
