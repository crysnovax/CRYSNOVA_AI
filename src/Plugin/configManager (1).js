const fs = require('fs');
const path = require('path');

const RUNTIME_FILE = path.join(__dirname, '../../database/runtime-config.json');

let runtime = {};

/* Load runtime config */
const load = () => {
    try {
        fs.mkdirSync(path.dirname(RUNTIME_FILE), { recursive: true });

        if (fs.existsSync(RUNTIME_FILE)) {
            runtime = JSON.parse(
                fs.readFileSync(RUNTIME_FILE, 'utf8')
            );
        } else {
            runtime = {};
            save();
        }
    } catch {
        runtime = {};
    }
};

/* Save runtime config */
const save = () => {
    try {
        fs.writeFileSync(
            RUNTIME_FILE,
            JSON.stringify(runtime, null, 2)
        );
    } catch (e) {
        console.error('configManager save error:', e.message);
    }
};

/* Set variable */
const setVar = (key, value) => {

    let v = value;

    if (value === 'true') v = true;
    else if (value === 'false') v = false;
    else if (!isNaN(value) && value !== '') v = Number(value);

    runtime[key] = v;
    save();

    /* ⭐ Clear require cache */
    Object.keys(require.cache).forEach(k => {
        if (k.includes('config') || k.includes('configManager')) {
            delete require.cache[k];
        }
    });

    return v;
};

/* Get variable */
const getVar = (key, fallback = null) => {
    if (!runtime) load();

    return Object.prototype.hasOwnProperty.call(runtime, key)
        ? runtime[key]
        : fallback;
};

/* Delete variable */
const delVar = (key) => {
    if (runtime && runtime.hasOwnProperty(key)) {
        delete runtime[key];
        save();
        return true;
    }
    return false;
};

/* Get all variables */
const allVars = () => {
    if (!runtime) load();
    return { ...runtime };
};

/* Reset all variables */
const resetAll = () => {
    runtime = {};
    save();
};

load();

module.exports = {
    setVar,
    getVar,
    delVar,
    allVars,
    resetAll
};