// plugins/manage.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PLUGINS_DIR = path.join(__dirname, '..'); // adjust to your bot's plugins root
const INSTALLED_FILE = path.join(PLUGINS_DIR, 'installed-plugins.json');

let installedPlugins = [];

// Load previously installed plugins
if (fs.existsSync(INSTALLED_FILE)) {
    try {
        installedPlugins = JSON.parse(fs.readFileSync(INSTALLED_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load installed-plugins.json:', e);
    }
}

function saveInstalledPlugins() {
    fs.writeFileSync(INSTALLED_FILE, JSON.stringify(installedPlugins, null, 2));
}

module.exports = {
    name: 'plugin',
    alias: ['plugins', 'removeplugin', 'delplugin'],
    desc: 'Manage plugins: install from URL, remove, or list installed',
    category: 'owner',
    usage: '.plugin <url>   .remove <url>   .plugins',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const cmd = (m.body || '').toLowerCase().split(/\s+/)[0].trim();

        // ── List installed plugins
        if (cmd === '.plugins') {
            if (!installedPlugins.length) return reply('No external plugins installed yet.');
            let text = '*Installed Plugins:*\n\n';
            installedPlugins.forEach((p, i) => text += `${i + 1}. ${p.url} → ${p.path}\n`);
            return reply(text);
        }

        // ── Install plugin
        if (cmd === '.plugin') {
            const url = args[0]?.trim();
            if (!url || !url.startsWith('http')) return reply('Provide a valid plugin URL.\nExample: .plugin https://.../plugin.js');

            if (installedPlugins.find(p => p.url === url)) return reply('This plugin is already installed.');

            try {
                await reply('✪ _*Downloading plugin...*_');

                const { data: code } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'CRYSNOVA-BOT' } });

                // Basic validation
                if (!code.includes('module.exports') && !code.includes('exports.')) {
                    return reply('Downloaded file does not appear to be a valid plugin module.');
                }

                // Try to parse category
                let category = 'misc';
                try {
                    const match = code.match(/category\s*:\s*['"`](\w+)['"`]/);
                    if (match) category = match[1];
                } catch {}

                const folderPath = path.join(PLUGINS_DIR, category);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

                const fileName = url.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');
                const filePath = path.join(folderPath, fileName);

                fs.writeFileSync(filePath, code, 'utf8');

                installedPlugins.push({ url, path: filePath });
                saveInstalledPlugins();

                await reply(
                    `✓ *Plugin installed successfully*!\n` +
                    `File: ${fileName}\n` +
                    `Category: ${category}\n` +
                    `Path: ${filePath}\n` +
                    `_*Restart bot or reload plugins to use it*_.`
                );
            } catch (err) {
                console.error('Plugin install error:', err.message);
                await reply(`Failed to install plugin:\n${err.message}`);
            }
            return;
        }

        // ── Remove plugin
        if (cmd === '.remove' || cmd === '.removeplugin' || cmd === '.delplugin') {
            const url = args[0]?.trim();
            if (!url) return reply('Provide the URL of the plugin to remove.\nExample: .remove https://.../plugin.js');

            const plugin = installedPlugins.find(p => p.url === url);
            if (!plugin) return reply('No plugin installed from that URL.');

            try {
                if (fs.existsSync(plugin.path)) fs.unlinkSync(plugin.path);
                installedPlugins = installedPlugins.filter(p => p.url !== url);
                saveInstalledPlugins();

                await reply(`*Plugin removed successfully!*\nURL: ${url}\nFile deleted: ${plugin.path}\nRestart bot or reload to apply.`);
            } catch (err) {
                console.error('Plugin remove error:', err);
                await reply(`Failed to remove plugin:\n${err.message}`);
            }
            return;
        }

        // ── Default help
        return reply(
            '*Plugin Manager Commands:*\n\n' +
            '`.plugin <url>` → install plugin from URL\n' +
            '`.remove <url>` → remove installed plugin\n' +
            '`.plugins` → list all installed plugin URLs'
        );
    }
};
