const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'setcrysai',
    alias: ['crysai', 'aimode'],
    desc: 'Toggle CRYSNOVA AI auto-reply when tagged in a group',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '🥏', success: '✅' },

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('CRYSNOVA_AI_MENTION', true);

        if (!args[0]) {
            return reply(
                `⚉ *CRYSNOVA AI Mention Reply*\n\n` +
                `Status: ${current !== false ? '👾 ON' : '✘ OFF'}\n\n` +
                `When ON: tagging the bot in a group triggers an AI response\n\n` +
                `Usage:\n• .setcrysai on\n• .setcrysai off`
            );
        }

        if (args[0].toLowerCase() === 'on') {
            setVar('CRYSNOVA_AI_MENTION', true);
            return reply('✓ CRYSNOVA AI mention reply: *ON*\n\n_Tag me in any group and I will respond with AI_');
        }

        if (args[0].toLowerCase() === 'off') {
            setVar('CRYSNOVA_AI_MENTION', false);
            return reply('✘ CRYSNOVA AI mention reply: *OFF*');
        }

        reply('Usage: .setcrysai on | .setcrysai off');
    }
};
