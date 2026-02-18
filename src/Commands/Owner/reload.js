const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'reload',
    alias: ['rl', 'refresh', 'relo'],
    desc: 'Reload all plugins without restarting the bot',
    category: 'owner',
    usage: '.reload',
    owner: true,

    execute: async (sock, m, { reply }) => {
        try {
            await reply('_*✪ Reloading all plugins...*_');

            // ── Plugin directory ── adjust to your bot's Plugin folder
            const pluginDir = path.join(__dirname, '../../Plugin'); // 2 levels up from Owner
            if (!fs.existsSync(pluginDir)) throw new Error('Plugin folder not found');

            const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));

            let reloadedCount = 0;

            for (const file of files) {
                const filePath = path.join(pluginDir, file);
                const resolvedPath = require.resolve(filePath);

                if (require.cache[resolvedPath]) {
                    delete require.cache[resolvedPath];
                    reloadedCount++;
                }
            }

            // ── Load crysLoadCmd safely
            const crysLoadCmdPath = path.join(pluginDir, 'crysLoadCmd.js');
            if (fs.existsSync(crysLoadCmdPath)) {
                const crysLoadCmd = require(crysLoadCmdPath);
                if (crysLoadCmd.loadCommands) await crysLoadCmd.loadCommands();
            } else {
                console.log('[RELOAD WARNING] crysLoadCmd.js not found at:', crysLoadCmdPath);
            }

            await reply(
                `✓ _*Reload successful!*_\n\n` +
                `*Reloaded* ```${reloadedCount}``` *plugin files*.\n` +
                `*All commands refreshed — test any command now.*`
            );

            // ── Optional reaction
            await sock.sendMessage(m.key.remoteJid, {
                react: { text: '🔄', key: m.key }
            });

        } catch (err) {
            console.error('[RELOAD ERROR]', err);
            await reply(`✘ *Reload failed*\n\`\`\`${err.message || 'Unknown error'}\`\`\``);
        }
    }
};
