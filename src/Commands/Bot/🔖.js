// src/Commands/Owner/aibadge.js
const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'aibadge',
    alias: ['badge', 'metabadge'],
    desc: 'Toggle Meta AI sparkle badge on all outgoing messages',
    category: 'Owner',
    ownerOnly: true,
    usage: '.aibadge on/off',
    reactions: { start: '✨', success: '〽️' },

    execute: async (sock, m, { args, reply }) => {
        const option = args[0]?.toLowerCase();

        if (option === 'on') {
            setVar('AI_BADGE', true);
            return reply(
                '`⎔ TOGGLED ON`'
            );
        }

        if (option === 'off') {
            setVar('AI_BADGE', false);
            return reply(
                 '`⇆TOGGLED OFF`'
            );
        }

        const current = getVar('AI_BADGE', true) !== false;
        return reply(
            `╭─❍ *AI BADGE STATUS*\n│\n` +
            `│ ✨ Current: ${current ? '*֎ ON*' : '*▢ OFF*'}\n│\n` +
            `│ ⚉ Usage: .aibadge on | off\n` +
            `╰──────────────────`
        );
    }
};
