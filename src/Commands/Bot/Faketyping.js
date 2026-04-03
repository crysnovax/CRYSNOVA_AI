const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'faketyping',
    alias: ['typing'],
    desc: 'Control fake typing behavior',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '⌨️', success: '📝' },

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('FAKE_TYPING', 'cmd');

        if (!args[0]) {
            const status =
                current === 'all' ? '_*❏◦ ON (all messages)✓*_' :
                current === 'cmd' ? '_*■⋆⁩⁩ ON (commands only)✓*_' :
                                    '_*ಠ_ಠ OFF*_';
            return reply(
                `⌨️ *Fake Typing*\n\n` +
                `Status: ${status}\n\n` +
                `Usage:\n` +
                `• .faketyping on — fire on all messages\n` +
                `• .faketyping on cmd — fire on commands only\n` +
                `• .faketyping off — disabled`
            );
        }

        const input = args.join(' ').toLowerCase().trim();

        if (input === 'on') {
            setVar('FAKE_TYPING', 'all');
            return reply('_*❏◦ Fake typing*_: *ON* _(all messages)_');
        }

        if (input === 'on cmd') {
            setVar('FAKE_TYPING', 'cmd');
            return reply('_*■⋆⁩⁩ Fake typing*_: *ON* _(commands only)_');
        }

        if (input === 'off') {
            setVar('FAKE_TYPING', false);
            return reply('_*ಠ_ಠ Fake typing*_: *OFF*');
        }

        reply('ಥ⁠‿⁠ಥ _*Usage: .faketyping on | .faketyping on cmd | .faketyping off*_');
    }
};
