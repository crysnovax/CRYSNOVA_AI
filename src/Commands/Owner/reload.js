const path = require('path');

const { loadCommands } = require('../../Plugin/crysLoadCmd');

module.exports = {
    name: 'reload',
    alias: ['rl', 'refresh'],
    category: 'owner',
    owner: true,
     // ⭐ Reaction config
    reactions: {
        start: '♻️',
        success: '💨'
    },
    

    execute: async (sock, m, { reply }) => {
        try {

            /* Clear NodeJS require cache for Commands folder */
            const cmdPath = path.join(__dirname, '../../Commands');

            Object.keys(require.cache).forEach(key => {
                if (key.startsWith(cmdPath)) {
                    delete require.cache[key];
                }
            });

            /* Reload commands */
            const total = loadCommands();

            await reply(`✓ _*Reloaded plugins*_\n📦 *Commands loaded: ${total}*`);

        } catch (e) {
            await reply('✘ *Reload failed*: ' + e.message);
        }
    }
};
