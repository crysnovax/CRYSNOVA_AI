const { removeBackground } = require('../Core/*.js');
const config = require('../../../settings/config');

// Use Remove.bg API key from config
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || config.api?.removebg || '';

module.exports = {
    name: 'rembg',
    alias: ['removebg', 'nobg', 'bgremove'],
    desc: 'Remove background from replied image',
    category: 'Tools',
    usage: '.rembg (reply to an image)',
    owner: false,

    execute: async (sock, m, { reply }) => {
        if (!m.quoted) {
            return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Reply to an image.\n╰──────────────────');
        }

        try {
            await reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✪ Removing background...\n╰──────────────────');

            const buffer = await m.quoted.download();
            if (!buffer || buffer.length < 100) {
                return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Failed to download image.\n╰──────────────────');
            }

            // Pass the API key to the core function (if it supports it)
            // Otherwise, we can call the API directly here.
            // For now, we assume the core function can accept a key or we override.
            const result = await removeBackground(buffer, REMOVE_BG_API_KEY);

            if (!result) return;

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: 'image/png',
                caption: `╭─❍ *CRYSNOVA AI V2.0*\n│ ✦ Background removed successfully.\n╰──────────────────`
            }, { quoted: m });

        } catch (err) {
            return reply(
`╭─❍ *CRYSNOVA AI V2.0*
│ ✘ Failed to remove background.
│
│ ✦ Check API key or credits.
╰──────────────────`
            );
        }
    }
};
