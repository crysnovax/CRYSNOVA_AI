//const fs = require('fs');
//const path = require('path');

//const DB_PATH = path.join(__dirname, '../../../database/lang_prefs.json');

// Language code → full name mapping
const LANG_NAMES = {
    en: 'English',   es: 'Spanish',   fr: 'French',    de: 'German',
    it: 'Italian',   pt: 'Portuguese',ru: 'Russian',   zh: 'Chinese',
    ja: 'Japanese',  ko: 'Korean',    ar: 'Arabic',    hi: 'Hindi',
    tr: 'Turkish',   pl: 'Polish',    nl: 'Dutch',     id: 'Indonesian',
    ms: 'Malay',     vi: 'Vietnamese',th: 'Thai',      sv: 'Swedish',
    no: 'Norwegian', da: 'Danish',    fi: 'Finnish',   ro: 'Romanian',
    uk: 'Ukrainian', cs: 'Czech',     hu: 'Hungarian', el: 'Greek',
    he: 'Hebrew',    bn: 'Bengali',   fa: 'Persian',   yo: 'Yoruba',
    ig: 'Igbo',      ha: 'Hausa',     sw: 'Swahili',   zu: 'Zulu'
};

// Load preferences
function loadPrefs() {
    try {
        if (fs.existsSync(DB_PATH))
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {}
    return { global: null, groups: {} };
}

function savePrefs(data) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Get target language for a chat (group or global)
function getLang(jid) {
    const db = loadPrefs();
    if (jid?.endsWith('@g.us') && db.groups[jid]) return db.groups[jid];
    return db.global || null;  // null = no translation
}

// Set target language
function setLang(jid, langCode, isGroup = false) {
    const db = loadPrefs();
    if (isGroup && jid?.endsWith('@g.us')) db.groups[jid] = langCode;
    else db.global = langCode;
    savePrefs(db);
}

// List of supported languages (keys from LANG_NAMES)
const SUPPORTED_LANGS = Object.keys(LANG_NAMES);

// Helper: format language list with aligned dots
function formatLanguageList() {
    const lines = [];
    for (const code of SUPPORTED_LANGS) {
        const name = LANG_NAMES[code];
        // Create dots to fill up to 12 characters after the code
        const dotCount = 12 - code.length;
        const dots = '.'.repeat(dotCount > 0 ? dotCount : 1);
        lines.push(`𒆜❏◦ ${code}${dots}✐ ${name}`);
    }
    return lines.join('\n');
}

module.exports = {
    name: 'setlang',
    alias: ['botlang', 'lang'],
    category: 'tools',
    desc: 'Set auto‑translation language for this chat (global or group)',
    usage: '.setlang list | .setlang <code> | .setlang group <code> | .setlang off',

    execute: async (sock, m, { args, reply }) => {
        const jid = m.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');

        if (!args[0] || args[0].toLowerCase() === 'list') {
            const list = formatLanguageList();
            const txt = `🌐 *Supported languages:*\n\n${list}\n\n` +
                        '`.setlang <code>`  (global)\n' +
                        (isGroup ? '`.setlang group <code>`  (this group only)\n' : '') +
                        '`.setlang off`  (disable translation)';
            return reply(txt);
        }

        if (args[0].toLowerCase() === 'off') {
            setLang(jid, null, isGroup && args[1] === 'group');
            return reply('_✓ Auto‑translation disabled for this chat._');
        }

        let targetLang = args[0].toLowerCase();
        let isGroupSetting = false;

        if (targetLang === 'group' && isGroup) {
            isGroupSetting = true;
            targetLang = args[1]?.toLowerCase();
            if (!targetLang) return reply('_Usage: .setlang group <code>_');
        }

        if (!SUPPORTED_LANGS.includes(targetLang)) {
            return reply(`_✘ Invalid language. Use .setlang list_`);
        }

        setLang(jid, targetLang, isGroupSetting);
        const where = isGroupSetting ? 'group' : 'global';
        const langName = LANG_NAMES[targetLang] || targetLang;
        return reply(`_✓ Auto‑translation set to ${langName} (${targetLang}) [${where}]_`);
    },

    // Export helpers for the message handler
    getLang,
    setLang
};
