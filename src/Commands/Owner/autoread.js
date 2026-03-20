const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'autoread',
    alias: ['setread'],
    desc: 'Toggle auto read messages',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '🐾', success: '💬' },

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('AUTO_READ', true);

        if (!args[0]) {
            return reply(
                `👁️ *Auto Read*\n\n` +
                `Status: ${current !== false ? '💬 ON' : '✘ OFF'}\n\n` +
                `Usage:\n• .autoread on\n• .autoread off`
            );
        }

        if (args[0].toLowerCase() === 'on') {
            setVar('AUTO_READ', true);
            return reply('🥏 Auto read: *ON*\n_Bot will mark all messages as read_');
        }

        if (args[0].toLowerCase() === 'off') {
            setVar('AUTO_READ', false);
            return reply('😩 Auto read: *OFF*');
        }

        reply('Usage: .autoread on | .autoread off');
    }
};
