const { setVar, allVars } = require('../../Plugin/configManager');

module.exports = {

    name: 'setvar',

    alias: ['setconfig'],

    desc: 'Set bot variable at runtime (no restart)',

    category: 'Owner',

    ownerOnly: true,
     // ⭐ Reaction config
    reactions: {
        start: '💫',
        success: '♻️'
    },
    

    execute: async (sock, m, { args, reply }) => {

        if (!args.length) {

            const runtime = allVars();

            const list = Object.keys(runtime).length

                ? Object.entries(runtime).map(([k, v]) => `• ${k} = ${v}`).join('\n')

                : 'No runtime variables set yet.';

            return reply(`𓉤 *SET VARIABLE*\n\n*Usage:* .setvar VARIABLE=VALUE\n\n*Examples:*\n.setvar PREFIX=!\n.setvar BOT_NAME=CRYSNOVA\n.setvar GROK_KEY=your_key\n\n*Current Variables:*\n${list}`);

        }

        const input = args.join(' ');

        const match = input.match(/^([A-Z_a-z0-9]+)=(.+)$/);

        if (!match) return reply('✘ Format: .setvar VARIABLE=VALUE\nExample: .setvar PREFIX=!');

        const [, varName, value] = match;

        const upperVar = varName.toUpperCase();

        try {

            const newVal = setVar(upperVar, value); // now any variable is allowed

            await reply(`✓ *Variable Updated!*\n\n*Variable:* ${upperVar}\n*New Value:* ${newVal}\n*Type:* ${typeof newVal}\n\n_Saved to database. No restart needed!_`);

        } catch (err) {

            await reply(`✘ Failed to save variable:\n${err.message}`);

        }

    }

};
