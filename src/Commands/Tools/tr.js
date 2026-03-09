const { translate, formatResult } = require('./translate-helper');

module.exports = {
    name: 'tr',
    alias: ['translate', 'trans'],
    category: 'Tools',
    desc: 'Translate text to any language',
    usage: '.tr <lang> [text] or reply to a message',

    execute: async (sock, m, { reply, args, quoted }) => {
        const lang = args[0]?.toLowerCase();

        if (!lang) return reply(
            `╭──────────────────────\n` +
            `│ 乂 *TRANSLATOR*\n` +
            `╰──────────────────────\n` +
            `*Usage:*\n` +
            `› *.tr en* Hello world\n` +
            `› *.tr fr* (reply to a message)\n\n` +
            `*Set default language:*\n` +
            `› *.settrd en*\n\n` +
            `*Translate to your default:*\n` +
            `› *.trd* (reply to a message)`
        );

        const text = args.slice(1).join(' ') || m.quoted?.text || '';
        if (!text) return reply(
            `╭──────────────────────\n` +
            `│ ✘ No text found\n` +
            `╰──────────────────────\n` +
            `Type text after the language or reply to a message.\n` +
            `*Example:* .tr en Hello`
        );

        try {
            const { translated, from } = await translate(text, lang);
            return reply(formatResult(translated, from, lang));
        } catch (err) {
            return reply(`✘ Translation failed — ${err.message}`);
        }
    }
};
