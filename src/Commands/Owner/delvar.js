const { delVar, getVar, VARS } = require('../../Plugin/configManager');

module.exports = {
    name: 'delvar',
    alias: ['resetvar'],
    desc: 'Reset a variable to default',
    category: 'Owner',
    ownerOnly: true,
    execute: async (sock, m, { args, reply }) => {
        if (!args.length) return reply('Usage: .delvar VARIABLE\nExample: .delvar PREFIX');
        const upper = args[0].toUpperCase();
        if (!VARS[upper]) return reply(`❌ Unknown variable: ${upper}`);
        const deleted = delVar(VARS[upper]);
        if (!deleted) return reply(`⚠️ ${upper} was not modified. Already using default.`);
        await reply(`✅ *${upper}* reset to default!`);
    }
};
