const { getVar, VARS } = require('../../Plugin/configManager');

module.exports = {
    name: 'getvar',
    alias: ['checkvar'],
    desc: 'Get a variable value',
    category: 'Owner',
    ownerOnly: true,
    execute: async (sock, m, { args, reply }) => {
        if (!args.length) return reply('Usage: .getvar VARIABLE\nExample: .getvar PREFIX');
        const upper = args[0].toUpperCase();
        if (!VARS[upper]) return reply(`❌ Unknown variable: ${upper}`);
        const val = getVar(VARS[upper], '(default - not set)');
        await reply(`📋 *${upper}*\n\nValue: ${val}\nKey: ${VARS[upper]}`);
    }
};
