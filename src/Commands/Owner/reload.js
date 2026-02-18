const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'reload',
    alias: ['r', 'refresh'],
    desc: 'Reload all plugins without restarting the bot',
    category: 'Bot',
    execute: async (sock, m, { config }) => {
        const pluginFolder = path.join(__dirname); // Adjust if your plugins are in another folder
        let reloaded = 0, failed = 0;

        const files = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'));

        for (const file of files) {
            try {
                const pluginPath = path.join(pluginFolder, file);
                delete require.cache[require.resolve(pluginPath)]; // Clear cache
                const newPlugin = require(pluginPath); // Reload plugin

                // Replace in global bot commands
                if (newPlugin.name && global.botCommands.has(newPlugin.name)) {
                    global.botCommands.set(newPlugin.name, newPlugin);
                    reloaded++;
                }
            } catch (err) {
                console.log('[RELOAD ERROR]', file, err.message);
                failed++;
            }
        }

        await sock.sendMessage(m.chat, {
            text: `✪ _*Reload complete!*_\n*✓ Plugins reloaded*: ${reloaded}\n*✘ Failed*: ${failed}`
        }, { quoted: m });
    }
};
