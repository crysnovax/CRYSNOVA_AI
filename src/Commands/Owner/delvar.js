const { delVar } = require('../../Plugin/configManager');
module.exports = {
    name: 'delvar',
    alias: ['dv'],
    desc: 'Delete a runtime config variable',
    category: 'Owner',
    ownerOnly: true,
    reactions: { start: '🗑️', success: '✅' },
    execute: async (sock, m, { args, reply }) => {
        if (!args[0]) return reply('Usage: .delvar KEY');
        const deleted = delVar(args[0].toUpperCase());
        reply(deleted ? `🗑️ Deleted: ${args[0].toUpperCase()}` : `Variable not found.`);
    }
};
