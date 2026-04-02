const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'faketyp',
    alias: ['ftyp','ftyping','typing'],
    desc: 'Toggle fake typing indicator when processing commands',
    category: 'Bot',
    ownerOnly: true,
    reactions: { start: '⌨️', success: '🤧' },

    execute: async (sock, m, { args, reply }) => {
        const sub = args[0]?.toLowerCase();

        // Show current status if no arg
        if (!sub) {
            const current = getVar('FAKE_TYPING') !== false;
            return reply(
                `⌨️ *Fake Typing*\n\n` +
                `• Status : ${current ? '✓ ON' : '✘ OFF'}\n\n` +
                `Commands:\n` +
                `• .faketyping on\n` +
                `• .faketyping off`
            );
        }

        if (sub === 'on') {
            setVar('FAKE_TYPING', true);
            return reply('⌨️ _*Fake Typing →*_ *ON*\n_Bot will show typing... when processing commands_');
        }

        if (sub === 'off') {
            setVar('FAKE_TYPING', false);
            return reply('⌨️ _*Fake Typing →*_ *OFF*');
        }

        reply('⚉ _Usage: .faketyping on | off_');
    }
};

