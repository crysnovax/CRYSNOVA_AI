const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'anticall',
    alias: ['setcall'],
    desc: 'Toggle anti call (auto reject incoming calls)',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '📵', success: '🥏' },

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('ANTI_CALL', true);

        if (!args[0]) {
            return reply(
                `📵 *Anti Call*\n\n` +
                `Status: ${current !== false ? '📑 ON' : '🚫 OFF'}\n\n` +
                `Usage:\n• .anticall on\n• .anticall off`
            );
        }

        if (args[0].toLowerCase() === 'on') {
            setVar('ANTI_CALL', true);
            return reply('💬 Anti call: *ON*\n_All incoming calls will be rejected automatically_');
        }

        if (args[0].toLowerCase() === 'off') {
            setVar('ANTI_CALL', false);
            return reply('🥏 Anti call: *OFF*\n_Incoming calls will not be rejected_');
        }

        reply('Usage: .anticall on | .anticall off');
    }
};
