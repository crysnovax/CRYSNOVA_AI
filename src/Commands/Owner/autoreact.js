// ZEE BOT V2 — Auto React on Tag
const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'autoreact',
    alias: ['setreact', 'tagreact'],
    desc: 'Set emoji to react with when bot is tagged in a group',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '⚡', success: '🤗' },

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('TAG_REACT_EMOJI') || process.env.TAG_REACT_EMOJI || '';

        if (!args[0]) {
            return reply(
                `✯ *Auto React on Tag*\n\n` +
                `Current: ${current || '_None (disabled)_'}\n\n` +
                `Usage:\n` +
                `• .autoreact ❤️   → set emoji\n` +
                `• .autoreact off  → disable`
            );
        }

        if (args[0].toLowerCase() === 'off' || args[0].toLowerCase() === 'clear') {
            setVar('TAG_REACT_EMOJI', '');
            return reply('_*✘ Auto react on tag disabled*_');
        }

        const emoji = args[0].trim();
        setVar('TAG_REACT_EMOJI', emoji);
        reply(`_*✦ Auto react set to*_: _*${emoji}_*\n\n_*Bot will react with ${emoji} whenever tagged in a group*_`);
    }
};
