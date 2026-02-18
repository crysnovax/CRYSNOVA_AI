// plugins/manage.js

const fs = require('fs');

const path = require('path');

const axios = require('axios');

const PLUGINS_DIR = path.join(__dirname, '..'); // or './plugins/' — adjust to your actual plugins folder

const INSTALLED_FILE = path.join(PLUGINS_DIR, 'installed-plugins.json');

let installedPlugins = [];

// Load previously installed plugins from JSON (if exists)

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

    owner: true, // Only owner should use this!

    execute: async (sock, m, { args, reply }) => {

        const cmd = (m.body || '').toLowerCase().split(/\s+/)[0].trim();

        // ── .plugins → List installed ────────────────────────────────

        if (cmd === '.plugins') {

            if (installedPlugins.length === 0) {

                return reply('No external plugins installed yet.');

            }

            let text = '*Installed Plugins:*\n\n';

            installedPlugins.forEach((url, i) => {

                text += `${i + 1}. ${url}\n`;

            });

            return reply(text);

        }

        // ── .plugin <url> → Install from URL ─────────────────────────

        if (cmd === '.plugin') {

            const url = args[0]?.trim();

            if (!url || !url.startsWith('http')) {

                return reply('Provide a valid URL\nExample: .plugin https://raw.githubusercontent.com/user/repo/main/plugin.js');

            }

            if (installedPlugins.includes(url)) {

                return reply('This plugin is already installed.');

            }

            try {

                await reply('Downloading plugin... ⏳');

                const { data: code } = await axios.get(url, {

                    timeout: 15000,

                    headers: { 'User-Agent': 'CRYSNOVA-BOT' }

                });

                // Basic validation: should look like valid JS module

                if (!code.includes('module.exports') && !code.includes('exports.')) {

                    return reply('Downloaded file does not appear to be a valid plugin module.');

                }

                // Generate safe filename from URL

                const fileName = url.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');

                const filePath = path.join(PLUGINS_DIR, fileName);

                fs.writeFileSync(filePath, code, 'utf8');

                installedPlugins.push(url);

                saveInstalledPlugins();

                await reply(

                    `Plugin installed successfully!\n\n` +

                    `File: ${fileName}\n` +

                    `URL: ${url}\n\n` +

                    `Restart bot or reload plugins to use it.`

                );

            } catch (err) {

                console.error('Plugin install error:', err.message);

                await reply(`Failed to install plugin:\n${err.message}`);

            }

        }

        // ── .remove <url> → Delete plugin ────────────────────────────

        else if (cmd === '.remove' || cmd === '.removeplugin' || cmd === '.delplugin') {

            const url = args[0]?.trim();

            if (!url) {

                return reply('Provide the URL of the plugin to remove\nExample: .remove https://.../plugin.js');

            }

            const index = installedPlugins.indexOf(url);

            if (index === -1) {

                return reply('No plugin installed from that URL.');

            }

            try {

                // Find corresponding file (we don't store filename, so guess from URL)

                const fileName = url.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');

                const filePath = path.join(PLUGINS_DIR, fileName);

                if (fs.existsSync(filePath)) {

                    fs.unlinkSync(filePath);

                }

                installedPlugins.splice(index, 1);

                saveInstalledPlugins();

                await reply(

                    `Plugin removed successfully!\n\n` +

                    `URL: ${url}\n` +

                    `File deleted: ${fileName}\n\n` +

                    `Restart bot or reload to apply changes.`

                );

            } catch (err) {

                console.error('Plugin remove error:', err);

                await reply(`Failed to remove plugin:\n${err.message}`);

            }

        }

        else {

            return reply(

                '*Plugin Manager Commands:*\n\n' +

                '`.plugin <url>` → install plugin from URL\n' +

                '`.remove <url>` → remove installed plugin\n' +

                '`.plugins` → list all installed plugin URLs'

            );

        }

    }

};