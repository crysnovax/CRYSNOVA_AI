// ── CRYSNOVA AI V2 PLUGIN MANAGER WITH SORTER & AUTO-LOAD ──
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PLUGINS_DIR = path.join(__dirname, '..'); // adjust to your bot root plugins folder
const INSTALLED_FILE = path.join(PLUGINS_DIR, 'installed-plugins.json');

let installedPlugins = [];
if (fs.existsSync(INSTALLED_FILE)) {
    try { installedPlugins = JSON.parse(fs.readFileSync(INSTALLED_FILE, 'utf8')); } 
    catch (e) { console.error('✘ Failed to load installed-plugins.json:', e); }
}
function saveInstalledPlugins() {
    fs.writeFileSync(INSTALLED_FILE, JSON.stringify(installedPlugins, null, 2));
}

// ── Load plugin into global.plugins and commands ──
function loadPlugin(filePath, pluginName) {
    try {
        delete require.cache[require.resolve(filePath)];
        const plugin = require(filePath);
        if (!global.plugins) global.plugins = {};
        global.plugins[pluginName] = plugin;

        // Auto-add commands if exists
        if (plugin.name) {
            if (!global.commands) global.commands = {};
            global.commands[plugin.name] = plugin;
            if (plugin.alias && Array.isArray(plugin.alias)) {
                plugin.alias.forEach(a => global.commands[a] = plugin);
            }
        }
        console.log(`✓ Plugin "${pluginName}" loaded into memory`);
        return true;
    } catch (err) {
        console.error(`✘ Failed to load plugin "${pluginName}":`, err.message);
        return false;
    }
}

// ── Unload plugin ──
function unloadPlugin(pluginName) {
    if (global.plugins && global.plugins[pluginName]) {
        delete global.plugins[pluginName];
    }
    if (global.commands) {
        for (const key in global.commands) {
            if (global.commands[key].name === pluginName) delete global.commands[key];
        }
    }
    console.log(`𓄄 Plugin "${pluginName}" unloaded`);
}

// ── Download plugin and sort by category ──
async function downloadAndSortPlugin(url) {
    const { data: code } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'CRYSNOVA-BOT' } });
    if (!code.includes('module.exports') && !code.includes('exports.')) throw new Error('✘ Not a valid plugin module');

    // Get category from code, default misc
    let category = 'misc';
    try {
        const catMatch = code.match(/category\s*:\s*['"`](.+?)['"`]/);
        if (catMatch) category = catMatch[1].toLowerCase();
    } catch { category = 'misc'; }

    const folderPath = path.join(PLUGINS_DIR, category);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    const fileName = url.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');
    const filePath = path.join(folderPath, fileName);

    fs.writeFileSync(filePath, code, 'utf8');

    // Auto-load
    loadPlugin(filePath, fileName.split('.js')[0]);

    return { filePath, fileName, category };
}

// ── Main Module ──
module.exports = {
    name: 'plugin',
    alias: ['plugins', 'removeplugin', 'delplugin'],
    desc: 'Manage plugins: install from URL, remove, list installed',
    category: 'owner',
    usage: '.plugin <url> | .remove <url> | .plugins',
    owner: true,
     // ⭐ Reaction config
    reactions: {
        start: '🔎',
        success: '📦'
    },
    

    execute: async (sock, m, { args, reply }) => {
        const cmd = (m.body || '').toLowerCase().split(/\s+/)[0].trim();

        // ── List installed plugins ──
        if (cmd === '.plugins') {
            if (!installedPlugins.length) return reply('⚉ No external plugins installed yet.');
            let text = '✪ *Installed Plugins:*\n\n';
            installedPlugins.forEach((url, i) => text += `${i + 1}. ${url}\n`);
            return reply(text);
        }

        // ── Install plugin from URL ──
        if (cmd === '.plugin') {
            const url = args[0]?.trim();
            if (!url || !url.startsWith('http')) return reply('⚠️ Provide a valid URL');
            if (installedPlugins.includes(url)) return reply('ℹ️ Plugin already installed');

            try {
                await reply('𓉤 Downloading plugin... ⏳');
                const { filePath, fileName, category } = await downloadAndSortPlugin(url);

                installedPlugins.push(url);
                saveInstalledPlugins();

                return reply(`✓ Installed successfully!\n📄 File: ${fileName}\n📂 Folder: ${category}\n🌐 URL: ${url}`);
            } catch (err) { return reply(`✘ Failed to install plugin:\n${err.message}`); }
        }

        // ── Remove plugin ──
        else if (cmd === '.remove' || cmd === '.removeplugin' || cmd === '.delplugin') {
            const url = args[0]?.trim();
            if (!url) return reply('⚠️ Provide the plugin URL to remove');

            const index = installedPlugins.indexOf(url);
            if (index === -1) return reply('ℹ️ Plugin not installed');

            try {
                const fileName = url.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');
                const categories = fs.readdirSync(PLUGINS_DIR).filter(d => fs.lstatSync(path.join(PLUGINS_DIR, d)).isDirectory());
                let filePath = '';
                for (const cat of categories) {
                    const possiblePath = path.join(PLUGINS_DIR, cat, fileName);
                    if (fs.existsSync(possiblePath)) { filePath = possiblePath; break; }
                }
                if (filePath) fs.unlinkSync(filePath);

                unloadPlugin(fileName.split('.js')[0]);
                installedPlugins.splice(index, 1);
                saveInstalledPlugins();

                return reply(`🗑️ Plugin removed\n📄 File: ${fileName}\n🌐 URL: ${url}`);
            } catch (err) { return reply(`✘ Failed to remove plugin:\n${err.message}`); }
        }

        // ── Help ──
        else {
            return reply(
                '⚉ *Plugin Manager Commands*\n\n' +
                '`.plugin <url>` → install plugin from URL\n' +
                '`.remove <url>` → remove installed plugin\n' +
                '`.plugins` → list all installed plugin URLs'
            );
        }
    }
};
