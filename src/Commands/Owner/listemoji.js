const { emojiCmds } = require('./setemoji.js');

module.exports = {
    name: 'listemoji',
    alias: ['emojilist', 'emojicmds', 'listemoji'],
    desc: 'List all emoji-to-command bindings',
    category: 'owner',
    ownerOnly: true,
    usage: '.listemoji',

    execute: async (sock, m, { reply, prefix }) => {
        const entries = Object.entries(emojiCmds);

        if (entries.length === 0) {
            return reply(
                `╭─❍ *EMOJI CMD LIST*\n│\n│ 𓄇 No emoji bindings found\n│\n│ ⚉ Use ${prefix}setemoji to add one\n╰──────────────────`
            );
        }

        let list = `╭─❍ *EMOJI CMD LIST* (${entries.length})\n│\n`;

        for (let i = 0; i < entries.length; i++) {
            const [emoji, command] = entries[i];
            const num = i + 1;
            list += `│ ${num}. ${emoji} → \`${prefix}${command}\`\n`;
        }

        list += `│\n╰──────────────────`;

        return reply(list);
    }
};