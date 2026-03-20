// © 2026 ZEE BOT | Powered by CRYSNOVA AI V2 Technology
// Config reads from .env (primary) → getVar runtime (secondary) → defaults

const fs   = require('fs');
const path = require('path');
const { getVar } = require('../src/Plugin/configManager');

/*
──────────────────────────────────────────
Load User Config (optional JSON override)
──────────────────────────────────────────
*/
const USER_CONFIG_PATH = path.join(__dirname, '../database/user-config.json');
let userConfig = {};
try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
        userConfig = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    }
} catch {}

/*
──────────────────────────────────────────
Auto-detect number from session creds
Priority:
  1. process.env (from .env file)
  2. getVar() runtime override (setvar command)
  3. user-config.json
  4. sessions/creds.json  ← auto after pairing
  5. Hardcoded fallback
──────────────────────────────────────────
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

const defaultNumber = process.env.OWNER_NUMBER || '2347043550282';

const resolvedOwner =
    process.env.OWNER_NUMBER        ||
    getVar('OWNER_NUMBER')          ||
    userConfig?.owner?.number       ||
    getSessionNumber()              ||
    defaultNumber;

/*
──────────────────────────────────────────
Config (ZEE BOT structure + CRYSNOVA V2 fields)
──────────────────────────────────────────
*/
const config = {

    // ════════════════════════════════════════════
    // BOT IDENTITY (ZEE BOT .env style)
    // ════════════════════════════════════════════
    owner: resolvedOwner,

    botNumber:
        process.env.BOT_NUMBER       ||
        getVar('BOT_NUMBER')         ||
        userConfig?.bot?.number      ||
        getSessionNumber()           ||
        defaultNumber,

    session:
        process.env.SESSION_NAME     ||
        getVar('SESSION_NAME')       ||
        userConfig?.session          ||
        'sessions',

    thumbUrl:
        process.env.THUMB_URL        ||
        getVar('THUMB_URL')          ||
        userConfig?.thumbUrl         ||
        'https://files.catbox.moe/z2rqc1.jpg',

    // ════════════════════════════════════════════
    // BOT STATUS / MODE (ZEE BOT .env style)
    // ════════════════════════════════════════════
    status: {
        public:   (process.env.PUBLIC_MODE   === 'true') ?? getVar('PUBLIC_MODE')   ?? userConfig?.bot?.public   ?? true,
        terminal: (process.env.TERMINAL_MODE !== 'false') ?? getVar('TERMINAL_MODE') ?? userConfig?.bot?.terminal ?? true,
        reactsw:  (process.env.REACT_STATUS  !== 'false') ?? getVar('REACT_STATUS')  ?? userConfig?.bot?.reactsw  ?? true
    },

    // ════════════════════════════════════════════
    // BOT MODE FLAGS (ZEE BOT specific)
    // ════════════════════════════════════════════
    mode: {
        autoRead:      process.env.AUTO_READ      !== 'false',
        autoTyping:    process.env.AUTO_TYPING    === 'true',
        autoRecording: process.env.AUTO_RECORDING === 'true',
        alwaysOnline:  process.env.ALWAYS_ONLINE  !== 'false',
        selfBot:       process.env.SELF_BOT       === 'true'
    },

    // ════════════════════════════════════════════
    // SETTINGS (CRYSNOVA V2 style with .env)
    // ════════════════════════════════════════════
    settings: {
        title:
            process.env.BOT_NAME         ||
            getVar('BOT_NAME')           ||
            userConfig?.bot?.name        ||
            'ZEE BOT',

        packname:
            process.env.BOT_NAME         ||
            getVar('BOT_NAME')           ||
            userConfig?.bot?.name        ||
            'ZEE BOT',

        prefix:
            process.env.PREFIX           ||
            getVar('PREFIX')             ||
            userConfig?.bot?.prefix      ||
            '.',

        description: 'Professional WhatsApp Bot — ZEE BOT powered by CRYSNOVA AI V2',
        author:      'https://github.com/crysnovax/ZEE_BOT',
        footer:      '© ZEE BOT | Powered by CRYSNOVA AI',

        ownerJid:
            getVar('OWNER_JID')          ||
            userConfig?.owner?.jid       ||
            `${resolvedOwner}@s.whatsapp.net`,

        ownerName:
            process.env.OWNER_NAME       ||
            getVar('OWNER_NAME')         ||
            userConfig?.owner?.name      ||
            'ZEE OWNER'
    },

    // ════════════════════════════════════════════
    // PERMISSIONS (ZEE BOT .env style)
    // ════════════════════════════════════════════
    permissions: {
        owners: process.env.OWNER_NUMBERS
            ? process.env.OWNER_NUMBERS.split(',').map(n => n.trim() + '@s.whatsapp.net')
            : [`${resolvedOwner}@s.whatsapp.net`],
        premium: [],
        banned: []
    },

    // ════════════════════════════════════════════
    // MESSAGES (CRYSNOVA V2 style)
    // ════════════════════════════════════════════
    message: {
        owner:   'no, this is for owners only ☠️',
        group:   'this is for groups only ☠️',
        admin:   'this command is for admins only ☠️',
        private: 'this is for private chat only ☠️'
    },

    mess: {
        owner: 'This command is only for the bot owner!',
        done:  'Mode changed successfully! ✓𓄄',
        error: 'Something went wrong! ✘𓄄',
        wait:  'Please wait... ⚉'
    },

    // ════════════════════════════════════════════
    // AUTO REPLY (ZEE BOT feature)
    // ════════════════════════════════════════════
    autoReply: {
        enabled: process.env.AUTO_REPLY !== 'false',
        ai: {
            enabled:   true,
            apiUrl:    process.env.AI_API_URL   || 'https://all-in-1-ais.officialhectormanuel.workers.dev/',
            model:     process.env.AI_MODEL     || 'gpt-4.5-preview',
            maxMemory: 10
        },
        greetings: {
            enabled:  true,
            keywords: ['hi', 'hello', 'hey', 'morning', 'afternoon', 'evening'],
            response: 'Hello! 👋 How can ZEE BOT help you today?'
        }
    },

    // ════════════════════════════════════════════
    // NEWSLETTER (CRYSNOVA V2 style)
    // ════════════════════════════════════════════
    newsletter: {
        name:
            process.env.BOT_NAME ||
            getVar('BOT_NAME')   ||
            'ZEE BOT',
        id: '120363402922206865@newsletter'
    },

    // ════════════════════════════════════════════
    // API KEYS (ZEE BOT .env style)
    // ════════════════════════════════════════════
    api: {
        baseurl:
            process.env.API_BASEURL  ||
            getVar('API_BASEURL')    ||
            'https://hector-api.vercel.app/',
        apikey:
            process.env.API_KEY      ||
            getVar('API_KEY')        ||
            'hector',
        groq:
            process.env.GROQ_API_KEY ||
            getVar('GROQ_API_KEY')   ||
            '',
        openai:
            process.env.OPENAI_API_KEY  ||
            getVar('OPENAI_API_KEY')    ||
            '',
        weather:
            process.env.WEATHER_API_KEY ||
            getVar('WEATHER_API_KEY')   ||
            ''
    },

    // ════════════════════════════════════════════
    // STICKER (CRYSNOVA V2 style)
    // ════════════════════════════════════════════
    sticker: {
        packname:
            process.env.BOT_NAME         ||
            getVar('BOT_NAME')           ||
            'ZEE BOT',
        author:
            process.env.STICKER_AUTHOR   ||
            getVar('STICKER_AUTHOR')     ||
            'ZEE BOT'
    },

    // ════════════════════════════════════════════
    // BRANDING (ZEE BOT style)
    // ════════════════════════════════════════════
    branding: {
        footer:  '© ZEE BOT | Powered by CRYSNOVA AI',
        channel: 'https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38',
        group:   process.env.GROUP_LINK || 'https://chat.whatsapp.com/Besbj8VIle1GwxKKZv1lax',
        repo:    'https://github.com/crysnovax/ZEE_BOT'
    },

    // ════════════════════════════════════════════
    // LOGGING (ZEE BOT style)
    // ════════════════════════════════════════════
    logging: {
        level:       process.env.LOG_LEVEL || 'silent',
        logCommands: true,
        logMessages: false
    }
};

module.exports = config;
