const { getVar, allVars } = require('../../Plugin/configManager');
module.exports = {
    name: 'getvar',
    alias: ['gv'],
    desc: 'Get a runtime config variable',
    category: 'Owner',
    ownerOnly: true,
    reactions: { start: '🔍', success: '👾' },
    execute: async (sock, m, { args, reply }) => {
        if (!args[0]) {
            const all = allVars();
            const keys = Object.keys(all);
            if (!keys.length) return reply('No variables set.');
            return reply('📋 Variables:\n' + keys.map(k => `• ${k} = ${all[k]}`).join('\n'));
        }
        const val = getVar(args[0].toUpperCase());
        reply(val !== null ? `${args[0].toUpperCase()} = ${val}` : `Variable not found.`);
    }
};
