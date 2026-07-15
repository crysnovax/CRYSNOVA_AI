// src/Commands/Bot/ssd.js — Meta Secure Server-side Data service toggle
const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'ssd',
    alias: ['securemeta', 'metasecure'],
    desc: 'Toggle Meta secure server-side data service (SSD) on all outgoing messages',
    category: 'Owner',
    ownerOnly: true,
    usage: '.ssd on/off',
    reactions: { start: '🔒', success: '✓' },

    execute: async (sock, m, { args, reply }) => {
        const option = args[0]?.toLowerCase();

        if (option === 'on') {
            setVar('META_SSD', true);
            return reply(
                '`🔒 META SSD ENABLED`\n_Secure server-side data: ON_'
            );
        }

        if (option === 'off') {
            setVar('META_SSD', false);
            return reply(
                 '`⚠️ META SSD DISABLED`\n_Secure server-side data: OFF_'
            );
        }

        const current = getVar('META_SSD', false) !== false;
        return reply(
            `╭─❍ *META SSD STATUS*\n│\n` +
            `│ 🔒 Current: ${current ? '*🟢 ON*' : '*🔴 OFF*'}\n│\n` +
            `│ ⚉ Usage: .ssd on | off\n` +
            `╰──────────────────`
        );
    }
};
