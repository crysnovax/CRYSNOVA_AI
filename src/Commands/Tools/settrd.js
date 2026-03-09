const { loadDefaults, saveDefaults, langName } = require('./translate-helper');

module.exports = {
    name: 'settrd',
    alias: ['settr', 'setdefaultlang'],
    category: 'Tools',
    desc: 'Set your default translation language',
    usage: '.settrd <lang>',

    execute: async (sock, m, { reply, args }) => {
        const lang = args[0]?.toLowerCase();

        if (!lang) return reply(
            `╭──────────────────────\n` +
            `│ ✘ Specify a language\n` +
            `╰──────────────────────\n` +
            `*Example:* .settrd en\n` +
            `*Example:* .settrd yo`
        );

        const defaults = loadDefaults();
        defaults[m.sender] = lang;
        saveDefaults(defaults);

        return reply(
            `╭──────────────────────\n` +
            `│ ✓ *Default language set*\n` +
            `╰──────────────────────\n` +
            `Your translations now default to *${langName(lang)}*.\n` +
            `Use *.trd* while replying to any message.`
        );
    }
};
