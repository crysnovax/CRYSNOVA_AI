const { emojiCmds, saveEmojiCmds } = require('./setemoji.js');

module.exports = {
    name: 'delemoji',
    alias: ['delemoji', 'unbindemoji', 'rmeemoji', 'delemojicmd'],
    desc: 'Delete an emoji-to-command binding',
    category: 'owner',
    ownerOnly: true,
    usage: '.delemoji <emoji>   or   reply to emoji with .delemoji',

    execute: async (sock, m, { args, reply, prefix }) => {
        // ── Determine the emoji to delete ─────────────────────
        let emoji;

        // MODE 1: Reply to an emoji message
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';

        if (quotedText && !args[0]) {
            emoji = quotedText.trim();
        }
        // MODE 2: Direct .delemoji <emoji>
        else if (args[0]) {
            emoji = args[0];
        }
        // ERROR: Nothing provided
        else {
            return reply(
                `╭─❍ *DELEMOJI*\n│\n│ ✘ Provide an emoji or reply to one\n│\n│ ⚉ Usage:\n│   ${prefix}delemoji <emoji>\n│   ${prefix}delemoji (reply to emoji)\n│\n│ 𓄄 Example:\n│   ${prefix}delemoji 😂\n╰──────────────────`
            );
        }

        // ── Check if binding exists ───────────────────────────
        if (!emojiCmds[emoji]) {
            return reply(
                `╭─❍ *DELEMOJI*\n│\n│ ✘ No binding found for: ${emoji}\n│\n│ ⚉ Use ${prefix}listemoji to see all\n╰──────────────────`
            );
        }

        // ── Delete and confirm ──────────────────────────────────
        const oldCmd = emojiCmds[emoji];
        delete emojiCmds[emoji];
        saveEmojiCmds();

        return reply(
            `╭─❍ *DELEMOJI*\n│\n│ ✓ Deleted!\n│\n│ 𓃼 Emoji: ${emoji}\n│ 𓄅 Was: \`${prefix}${oldCmd}\`\n│\n╰──────────────────`
        );
    }
};