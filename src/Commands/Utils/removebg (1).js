const { removeBackground } = require('../Core/*.js');

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

            const result = await removeBackground(buffer, reply);

            if (!result) return; // stops if no API key

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