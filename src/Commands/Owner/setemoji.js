const fs = require('fs');
const path = require('path');

const EMOJI_CMD_FILE = path.join(__dirname, '../../../database/emoji_cmds.json');

let emojiCmds = {};

const loadEmojiCmds = () => {
    try {
        if (fs.existsSync(EMOJI_CMD_FILE)) {
            emojiCmds = JSON.parse(fs.readFileSync(EMOJI_CMD_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[EMOJI CMD LOAD ERROR]', e.message);
        emojiCmds = {};
    }
};

const saveEmojiCmds = () => {
    try {
        const dir = path.dirname(EMOJI_CMD_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(EMOJI_CMD_FILE, JSON.stringify(emojiCmds, null, 2));
    } catch (e) {
        console.error('[EMOJI CMD SAVE ERROR]', e.message);
    }
};

loadEmojiCmds();

module.exports = {
    name: 'setemoji',
    alias: ['bindemoji', 'emojicmd', 'emoji2cmd', 'addemoji'],
    desc: 'Bind a command to an emoji — sending just that emoji triggers the command',
    category: 'owner',
    ownerOnly: true,
    usage: '.setemoji <command> (reply to an emoji)\n.setemoji <emoji> <command>',

    execute: async (sock, m, { args, reply, prefix }) => {
        // ── MODE 1: Reply to an emoji ──────────────────────────
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';

        if (quotedText && args[0] && !args[1]) {
            // Replying to a message + only one arg = that arg is the command
            const emoji = quotedText.trim();
            const command = args[0];

            if (emojiCmds[emoji]) {
                const oldCmd = emojiCmds[emoji];
                emojiCmds[emoji] = command;
                saveEmojiCmds();
                return reply(
                    `╭─❍ *SETEMOJI*\n│\n│ ✓ Updated!\n│\n│ 𓃼 Emoji: ${emoji}\n│ 𓄅 Old: ${oldCmd}\n│ 𓄅 New: ${command}\n│\n╰──────────────────`
                );
            }

            emojiCmds[emoji] = command;
            saveEmojiCmds();
            return reply(
                `╭─❍ *SETEMOJI*\n│\n│ ✓ Binded!\n│\n│ 𓃼 Emoji: ${emoji}\n│ ⚉ Command: ${command}\n│\n│  Now sending ${emoji} triggers:\n│  \`${prefix}${command}\`\n╰──────────────────`
            );
        }

        // ── MODE 2: Direct .setemoji <emoji> <command> ──────────
        if (args[0] && args[1]) {
            const emoji = args[0];
            const command = args.slice(1).join(' ');

            if (emojiCmds[emoji]) {
                const oldCmd = emojiCmds[emoji];
                emojiCmds[emoji] = command;
                saveEmojiCmds();
                return reply(
                    `╭─❍ *SETEMOJI*\n│\n│ ✓ Updated!\n│\n│ 𓃼 Emoji: ${emoji}\n│ 𓄅 Old: ${oldCmd}\n│ 𓄅 New: ${command}\n│\n╰──────────────────`
                );
            }

            emojiCmds[emoji] = command;
            saveEmojiCmds();
            return reply(
                `╭─❍ *SETEMOJI*\n│\n│ ✓ Binded!\n│\n│ 𓃼 Emoji: ${emoji}\n│ ⚉ Command: ${command}\n│\n│  Now sending ${emoji} triggers:\n│  \`${prefix}${command}\`\n╰──────────────────`
            );
        }

        // ── ERROR: Invalid usage ────────────────────────────────
        return reply(
            `╭─❍ *SETEMOJI*\n│\n│ ✘ Invalid usage\n│\n│ ⚉ Modes:\n│   Reply to emoji → ${prefix}setemoji <command>\n│   Direct → ${prefix}setemoji <emoji> <command>\n│\n│ 𓄄 Examples:\n│   ${prefix}setemoji ping (reply to 😂)\n│   ${prefix}setemoji 😂 ping\n╰──────────────────`
        );
    }
};

module.exports.emojiCmds = emojiCmds;
module.exports.loadEmojiCmds = loadEmojiCmds;
module.exports.saveEmojiCmds = saveEmojiCmds;