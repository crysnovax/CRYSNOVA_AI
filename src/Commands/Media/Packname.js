const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'pk',
    alias: ['packauthor', 'setpack'],
    category: 'tools',
    desc: 'Steal sticker with CRYSNOVA AI pack and custom author name',
    usage: '.pk <author name> (reply to a sticker)',

    execute: async (sock, m, { args, reply }) => {
        try {
            // Get author name from args
            const author = args.join(' ').trim();
            if (!author) {
                return reply('_*⚉ Usage: .pk <author name> (reply to a sticker)*_');
            }

            const quoted = m.quoted ? m.quoted : m;
            const mime = (quoted.msg || quoted).mimetype || '';
            if (!/webp/.test(mime)) {
                return reply('_*⚉ Reply to a sticker.*_');
            }

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

            // Download sticker buffer
            const stream = await downloadContentFromMessage(quoted.msg || quoted, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Create sticker with fixed pack name + custom author
            const sticker = new Sticker(buffer, {
                pack: 'CRYSNOVA AI',
                author: author,          // 👈 user-provided author
                type: 'full'
            });
            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '😎', key: m.key } });

        } catch (err) {
            console.error('PK ERROR:', err);
            reply('_*✘ Failed to take sticker.*_');
        }
    }
};
