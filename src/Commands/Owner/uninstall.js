const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..');
const INSTALLED_FILE = path.join(PLUGINS_DIR, 'installed-plugins.json');

if (!global.plugins) global.plugins = {};
if (!global.commands) global.commands = {};

function unloadPlugin(name) {
    if (global.plugins[name]) delete global.plugins[name];

    for (const cmd in global.commands) {
        if (global.commands[cmd]?.name === name) {
            delete global.commands[cmd];
        }
    }
}

function findPluginFileByName(name) {
    const categories = fs.readdirSync(PLUGINS_DIR)
        .filter(d => fs.lstatSync(path.join(PLUGINS_DIR, d)).isDirectory());

    for (const cat of categories) {
        const filePath = path.join(PLUGINS_DIR, cat, name);
        if (fs.existsSync(filePath)) return filePath;
    }
    return null;
}

module.exports = {
    name: 'uninstall',
    alias: [],
    category: 'owner',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const input = args[0];
        if (!input) return reply('Provide plugin URL or filename');

        // ── Load installed list ──
        let installed = [];
        if (fs.existsSync(INSTALLED_FILE)) {
            try {
                installed = JSON.parse(fs.readFileSync(INSTALLED_FILE));
            } catch { installed = []; }
        }

        // ── If URL ──
        if (input.startsWith('http')) {
            const index = installed.indexOf(input);
            if (index === -1) return reply('Plugin URL not found');

            const fileName = input.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');
            const filePath = findPluginFileByName(fileName);

            if (filePath) fs.unlinkSync(filePath);

            const name = fileName.replace('.js','');
            unloadPlugin(name);

            installed.splice(index, 1);
            fs.writeFileSync(INSTALLED_FILE, JSON.stringify(installed, null, 2));

            return reply(`✓ Uninstalled ${fileName}`);
        }

        // ── If filename (name.js) ──
        const fileName = input.endsWith('.js') ? input : input + '.js';
        const filePath = findPluginFileByName(fileName);

        if (!filePath) return reply('Plugin file not found');

        fs.unlinkSync(filePath);

        const name = fileName.replace('.js','');
        unloadPlugin(name);

        return reply(`✓ Uninstalled ${fileName}`);
    }
};