const { setVar, getVar, allVars } = require('../../Plugin/configManager');

module.exports = {
    name: 'setvar',
    alias: ['setconfig'],
    desc: 'Set bot variable at runtime (no restart)',
    category: 'Owner',
    ownerOnly: true,

    reactions: {
        start: '💫',
        success: '♻️'
    },

    execute: async (sock, m, { args, reply }) => {

        if (!args.length) {

            const vars = allVars();

            const list = Object.keys(vars).length
                ? Object.entries(vars)
                    .map(([k, v]) => `• ${k} = ${v}`)
                    .join('\n')
                : 'No runtime variables set yet.';

            return reply(
`𓉤 *SET VARIABLE*

Usage:
.setvar VARIABLE=VALUE

Examples:
.setvar PREFIX=!
.setvar BOT_NAME=CRYSNOVA
.setvar GROQ_API_KEY=your_key

Current Runtime Variables:
${list}`
            );
        }

        const input = args.join(' ');
        const match = input.match(/^([A-Za-z0-9_]+)=(.+)$/);

        if (!match) {
            return reply('✘ Format: .setvar VARIABLE=VALUE\nExample: .setvar PREFIX=!');
        }

        const [, varName, value] = match;
        const key = varName.toUpperCase();

        try {

            const saved = setVar(key, value);

            await reply(
`✓ Variable Updated

Variable : ${key}
Value    : ${saved}
Type     : ${typeof saved}

Saved to database ✓
No restart required.`
            );

        } catch (err) {

            await reply(`✘ Failed to save variable:\n${err.message}`);

        }
    }
};