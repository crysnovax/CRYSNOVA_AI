// © 2026 CRYSNOVA AI V2.0 - All Rights Reserved.
// Auto-loads from user-config.json (created during first setup)
const fs = require('fs');
const path = require('path');
const { getVar } = require('../src/Plugin/configManager');

/*
──────────────────────────────
Load User Config
──────────────────────────────
*/

const USER_CONFIG_PATH = path.join(__dirname, '../database/user-config.json');

let userConfig = {};

try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
        userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    }
} catch {}

/*
──────────────────────────────
Auto-detect number from session
──────────────────────────────
Priority:
  1. ENV / setvar  (getVar)
  2. user-config.json
  3. sessions/creds.json  ← auto after pairing
  4. Hardcoded fallback
──────────────────────────────
*/

const getSessionNumber = () => {
    try {
        const credsPath = path.join(__dirname, '../sessions/creds.json');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            const rawId = creds?.me?.id;
            if (rawId) return rawId.split(':')[0].split('@')[0];
        }
    } catch {}
    return null;
};

const defaultNumber = "2349019635738";

const resolvedOwner =
    getVar("OWNER_NUMBER")       ||
    userConfig?.owner?.number    ||
    getSessionNumber()           ||  // ← auto from session after first pair
    defaultNumber;

/*
──────────────────────────────
Config
──────────────────────────────
*/

const config = {

    owner: resolvedOwner,

    botNumber:
        getVar("BOT_NUMBER")      ||
        userConfig?.bot?.number   ||
        userConfig?.owner?.number ||
        getSessionNumber()        ||
        defaultNumber,

    session: "sessions",

    thumbUrl:
        getVar("THUMB_URL") ||
        userConfig?.thumbUrl ||
        "https://crysnovax-media-api.crysnovax.workers.dev/1771948318227-media",

    status: {
        public:   getVar("PUBLIC_MODE")   ?? userConfig?.bot?.public   ?? true,
        terminal: getVar("TERMINAL_MODE") ?? userConfig?.bot?.terminal ?? true,
        reactsw:  getVar("REACT_STATUS")  ?? userConfig?.bot?.reactsw  ?? true
    },

    message: {
        owner:   "no, this is for owners only by crysnova ☠️",
        group:   "this is for groups only by crysnova ☠️",
        admin:   "this command is for admin only by crysnova ☠️",
        private: "this is specifically for private chat by crysnova ☠️"
    },

    mess: {
        owner: "This command is only for the bot owner! by crysnova ☠️",
        done:  "Mode changed successfully! ✓𓄄",
        error: "Something went wrong!✘𓄄",
        wait:  "Please wait...⚉"
    },

    settings: {

        title:
            getVar("BOT_NAME")      ||
            userConfig?.bot?.name   ||
            "CRYSN⚉VA AI V2",

        packname:
            getVar("BOT_NAME")      ||
            userConfig?.bot?.name   ||
            "CRYSNOVA",

        prefix:
            getVar("PREFIX")        ||
            userConfig?.bot?.prefix ||
            ".",

        description: "Professional WhatsApp Bot - CRYSNOVA AI V2.0",
        author:      "https://github.com/crysnovax/CRYSNOVA_AI",
        footer:      "𝗖𝗥𝗬𝗦𝗡𝗢𝗩𝗔: @crysnovax",

        // Always uses resolvedOwner — never wrong number
        ownerJid:
            getVar("OWNER_JID")     ||
            userConfig?.owner?.jid  ||
            `${resolvedOwner}@s.whatsapp.net`,

        ownerName:
            getVar("OWNER_NAME")    ||
            userConfig?.owner?.name ||
            "CRYSNOVA"
    },

    newsletter: {
        name:
            getVar("BOT_NAME")    ||
            userConfig?.bot?.name ||
            "CRYSNOVA AI V2",

        id: "0@newsletter"
    },

    api: {
        baseurl:
            getVar("API_BASEURL") ||
            "https://hector-api.vercel.app/",

        apikey:
            getVar("API_KEY") ||
            "hector",

        groq:
            getVar("GROQ_API_KEY")    ||
            process.env.GROQ_API_KEY  ||
            ""
    },

    sticker: {
        packname:
            getVar("BOT_NAME") ||
            userConfig?.bot?.name ||
            "CRYSNOVA AI V2",

        author:
            getVar("STICKER_AUTHOR") ||
            "CRYSN⚉VA"
    }
};

module.exports = config;
