const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ── Persistent default language store ─────────────────
const DB_PATH = path.join(__dirname, '../../database/translate-defaults.json');

const loadDefaults = () => {
    try {
        if (fs.existsSync(DB_PATH))
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {}
    return {};
};

const saveDefaults = (data) => {
    try {
        if (!fs.existsSync(path.dirname(DB_PATH)))
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch {}
};

// ── Language name map ─────────────────────────────────
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

const langName = (code) =>
    LANG_NAMES[code?.toLowerCase()] || code?.toUpperCase() || '?';

// ── Core translator ───────────────────────────────────
const translate = async (text, targetLang) => {
    // Primary: Google Translate
    try {
        const res = await axios.get(
            'https://translate.googleapis.com/translate_a/single',
            {
                params: { client: 'gtx', sl: 'auto', tl: targetLang, dt: 't', q: text },
                timeout: 10000
            }
        );
        const data = res.data;
        if (!data?.[0]) throw new Error('empty');
        return {
            translated: data[0].map(i => i?.[0] || '').join('').trim(),
            from: data?.[2] || 'auto'
        };
    } catch {}

    // Fallback: MyMemory
    const res = await axios.get('https://api.mymemory.translated.net/get', {
        params: { q: text, langpair: `auto|${targetLang}` },
        timeout: 10000
    });
    if (res.data?.responseStatus !== 200)
        throw new Error('Translation service unavailable');
    return {
        translated: res.data.responseData.translatedText,
        from: 'auto'
    };
};

// ── Format output ─────────────────────────────────────
const formatResult = (translated, from, to) =>
    `╭──────────────────────\n` +
    `│ 乂 *TRANSLATION*\n` +
    `│ ☬ ${langName(from)} ➜ ${langName(to)}\n` +
    `╰──────────────────────\n` +
    `${translated}`;

module.exports = { translate, formatResult, loadDefaults, saveDefaults, langName };
