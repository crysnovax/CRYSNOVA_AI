const fs = require('fs');
const path = require('path');
const { getVar } = require('../src/Plugin/configManager.js');

/*
Load User Config
*/

const USER_CONFIG_PATH = path.join(__dirname, '../database/user-config.json');

let userConfig = {};

try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
        userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    }
} catch {}

/*
Default Number
*/

const defaultNumber = "2348077528901";

/*
Config
*/

const config = {

    owner: getVar("OWNER_NUMBER") ||
           userConfig?.owner?.number ||
           defaultNumber,

    botNumber:
        getVar("BOT_NUMBER") ||
        userConfig?.bot?.number ||
        defaultNumber,

    session: "sessions",

    thumbUrl:
        getVar("THUMB_URL") ||
        "https://crysnovax-media-api.crysnovax.workers.dev/1771948318227-media",

    status: {
        public: getVar("PUBLIC_MODE") ?? userConfig?.bot?.public ?? false,
        terminal: getVar("TERMINAL_MODE") ?? userConfig?.bot?.terminal ?? true,
        reactsw: getVar("REACT_STATUS") ?? userConfig?.bot?.reactsw ?? true
    },

    message: {
        owner: "no, this is for owners only by crysnova ☠️",
        group: "this is for groups only by crysnova ☠️",
        admin: "this command is for admin only by crysnova ☠️",
        private: "this is specifically for private chat by crysnova ☠️"
    },

    mess: {
        owner: "This command is only for the bot owner!",
        done: "Mode changed successfully! ✓",
        error: "Something went wrong!",
        wait: "Please wait..."
    },

    settings: {

        title:
            getVar("BOT_NAME") ||
            userConfig?.bot?.name ||
            "CRYSN⚉VA AI V2",

        packname:
            getVar("BOT_NAME") ||
            userConfig?.bot?.name ||
            "CRYSNOVA",

        prefix:
            getVar("PREFIX") ||
            userConfig?.bot?.prefix ||
            ".",

        description: "Professional WhatsApp Bot - CRYSNOVA AI V2.0",

        author: "https://github.com/crysnovax/CRYSNOVA_AI",

        footer: "𝗖𝗥𝗬𝗦𝗡𝗢𝗩𝗔: @crysnovax",

        ownerJid:
            getVar("OWNER_JID") ||
            userConfig?.owner?.jid ||
            `${defaultNumber}@s.whatsapp.net`,

        ownerName:
            getVar("OWNER_NAME") ||
            userConfig?.owner?.name ||
            "CRYSNOVA"
    },

    newsletter: {
        name:
            getVar("BOT_NAME") ||
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
            getVar("GROQ_API_KEY") ||
            process.env.GROQ_API_KEY ||
            ""
    },

    sticker: {

        packname:
            getVar("BOT_NAME") ||
            "CRYSNOVA AI V2",

        author:
            getVar("STICKER_AUTHOR") ||
            "CRYSN⚉VA"
    }
};

module.exports = config;
