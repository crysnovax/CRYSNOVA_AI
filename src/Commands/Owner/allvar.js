const { allVars, VARS } = require('../../Plugin/configManager');

module.exports = {
    name: 'allvar',
    alias: ['listvars', 'vars'],
    desc: 'List all runtime variables',
    category: 'Owner',
    ownerOnly: true,
    execute: async (sock, m, { reply }) => {
        const runtime = allVars();
        if (!Object.keys(runtime).length) {
            const list = Object.keys(VARS).map(v => `• ${v}`).join('\n');
            return reply(`📋 *No runtime variables set yet*\n\n*Available Variables:*\n${list}\n\n*Usage:* .setvar VARIABLE=VALUE`);
        }
        const entries = Object.entries(runtime).map(([k, v]) => {
            const varName = Object.entries(VARS).find(([, key]) => key === k)?.[0] || k;
            return `• ${varName} = ${v}`;
        }).join('\n');
        await reply(`⚙️ *Runtime Variables (${Object.keys(runtime).length})*\n\n${entries}\n\n_Use .delvar VARIABLE to reset to default_`);
    }
};
