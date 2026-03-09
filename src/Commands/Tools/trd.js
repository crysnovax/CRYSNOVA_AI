const { translate, formatResult, loadDefaults, langName } = require('./translate-helper');

module.exports = {
    name: 'trd',
    alias: ['trdefault'],
    category: 'Tools',
    desc: 'Translate to your default language',
    usage: '.trd [text] or reply to a message',

    execute: async (sock, m, { reply, args, quoted }) => {
        const defaults = loadDefaults();
        const lang = defaults[m.sender];

        if (!lang) return reply(
            `╭──────────────────────\n` +
            `│ ✘ No default language set\n` +
            `╰──────────────────────\n` +
            `Set one first with *.settrd <lang>*\n` +
            `*Example:* .settrd en`
        );

        const text = args.join(' ') || m.quoted?.text || '';

        if (!text) return reply(
            `╭──────────────────────\n` +
            `│ ✘ No text found\n` +
            `╰──────────────────────\n` +
            `Reply to a message or type text after *.trd*`
        );

        try {
            const { translated, from } = await translate(text, lang);
            return reply(formatResult(translated, from, lang));
        } catch (err) {
            return reply(`✘ Translation failed — ${err.message}`);
        }
    }
};
