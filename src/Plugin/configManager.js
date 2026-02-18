/**
 * CRYSNOVA AI V2.0 - Dynamic Config Manager (.setvar system like Kord)
 */

const fs = require('fs');
const path = require('path');

const RUNTIME_FILE = path.join(__dirname, '../../database/runtime-config.json');

let runtime = {};

const load = () => {
    try {
        if (fs.existsSync(RUNTIME_FILE)) runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
    } catch { runtime = {}; }
};

const save = () => {
    try {
        fs.mkdirSync(path.dirname(RUNTIME_FILE), { recursive: true });
        fs.writeFileSync(RUNTIME_FILE, JSON.stringify(runtime, null, 2));
    } catch (e) { console.error('configManager save error:', e.message); }
};

const setVar = (key, value) => {
    let v = value;
    if (value === 'true') v = true;
    else if (value === 'false') v = false;
    else if (!isNaN(value) && value !== '') v = Number(value);
    runtime[key] = v;
    save();
    return v;
};

const getVar = (key, fallback = null) => {
    return runtime.hasOwnProperty(key) ? runtime[key] : fallback;
};

const delVar = (key) => {
    if (runtime.hasOwnProperty(key)) {
        delete runtime[key];
        save();
        return true;
    }
    return false;
};

const allVars = () => ({ ...runtime });

const resetAll = () => { runtime = {}; save(); };

load();

// All supported variables
const VARS = {
    PREFIX:           'prefix',
    BOT_NAME:         'botName',
    OWNER_NUMBER:     'ownerNumber',
    PUBLIC_MODE:      'publicMode',
    AUTO_READ:        'autoRead',
    AUTO_REACT:       'autoReact',
    ANTILINK:         'antilink',
    ANTILINK_ACTION:  'antilinkAction',
    ANTIDELETE:       'antidelete',
    ANTIBADWORD:      'antibadword',
    ANTICALL:         'anticall',
    ANTINSFW:         'antinsfw',
    WELCOME:          'welcome',
    WELCOME_MSG:      'welcomeMsg',
    GOODBYE_MSG:      'goodbyeMsg',
    COOLDOWN:         'cooldown',
    STICKER_AUTHOR:   'stickerAuthor',
    STICKER_PACK:     'stickerPack',
    WAIT_MSG:         'waitMsg',
    ERROR_MSG:        'errorMsg',
    GROQ_KEY:         'groqKey'
};

module.exports = { setVar, getVar, delVar, allVars, resetAll, VARS };
