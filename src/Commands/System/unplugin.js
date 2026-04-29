const fs = require('fs');
const path = require('path');
const { pluginsDB, savePluginsDB } = require('./plugin.js');

const PLUGINS_DIR = path.join(__dirname, '../../../plugins');

module.exports = {
    name: 'unplugin',
    alias: ['uninstall', 'removeplugin', 'delplugin'],
    desc: 'Uninstall an external plugin by name, URL, or reply to URL',
    category: 'owner',
    ownerOnly: true,
    usage: '.unplugin <name>\n.unplugin <url>\n.unplugin (reply to URL)',
    reactions: {
        start: '🗑️',
        success: '🧹'
    },

    execute: async (sock, m, { args, reply }) => {
        let target;

        // MODE 1: Reply to a message with URL
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';

        if (quotedText) {
            const urlMatch = quotedText.match(/https?:\/\/[^\s]+/);
            target = urlMatch ? urlMatch[0] : quotedText.trim();
        }
        // MODE 2: Direct argument (name or URL)
        else if (args.length > 0) {
            target = args.join(' ').trim();
        }
        // ERROR: Nothing provided
        else {
            return reply(
                `╭─❍ *UNINSTALL PLUGIN*\n│\n│ ✘ Provide plugin name, URL, or reply to URL\n│\n│ ⚉ Usage:\n│   .unplugin <name>\n│   .unplugin <url>\n│   .unplugin (reply to URL)\n│\n│ 𓄄 Examples:\n│   .unplugin ping\n│   .unplugin https://cdn.example.com/ping.txt\n│   (reply to URL) → .unplugin\n╰──────────────────`
            );
        }

        if (!target) {
            return reply(
                `╭─❍ *UNINSTALL PLUGIN*\n│\n│ ✘ Could not extract target\n│\n│ ⚉ Use .plugins to see installed\n╰──────────────────`
            );
        }

        // Search for the plugin
        let found = null;

        // 1. Search by exact URL
        if (pluginsDB[target]) {
            found = { url: target, ...pluginsDB[target] };
        }

        // 2. Search by name (case insensitive)
        if (!found) {
            for (const [url, info] of Object.entries(pluginsDB)) {
                if (info.name.toLowerCase() === target.toLowerCase()) {
                    found = { url, ...info };
                    break;
                }
            }
        }

        // 3. Search by partial URL match (case insensitive)
        if (!found) {
            for (const [url, info] of Object.entries(pluginsDB)) {
                if (url.toLowerCase().includes(target.toLowerCase())) {
                    found = { url, ...info };
                    break;
                }
            }
        }

        // 4. Search by filename match
        if (!found) {
            for (const [url, info] of Object.entries(pluginsDB)) {
                if (info.file.toLowerCase().includes(target.toLowerCase())) {
                    found = { url, ...info };
                    break;
                }
            }
        }

        if (!found) {
            return reply(
                `╭─❍ *UNINSTALL PLUGIN*\n│\n│ ✘ Not found: ${target}\n│\n│ ⚉ Check spelling or use .plugins\n╰──────────────────`
            );
        }

        // Delete the file
        const filePath = path.join(PLUGINS_DIR, found.file);
        let fileDeleted = false;
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                fileDeleted = true;
            } catch (e) {
                console.error('[UNPLUGIN] File delete error:', e.message);
            }
        }

        // Remove from cache if loaded
        try {
            delete require.cache[require.resolve(filePath)];
        } catch {}

        // Remove from DB
        delete pluginsDB[found.url];
        savePluginsDB();

        return reply(
            `╭─❍ *UNINSTALLED*\n│\n│ ✓ Plugin removed\n│\n│ 𓃼 Name: ${found.name}\n│ 𝌆 Category: ${found.category}\n│ ⎔ File: ${found.file}\n│ 🗑️ Deleted: ${fileDeleted ? 'Yes' : 'No (already gone)'}\n│\n│ ⚉ Changes take effect immediately\n╰──────────────────`
        );
    }
};
