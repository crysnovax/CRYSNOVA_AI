const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'take',
    alias: ['steal', 'takesticker'],
    category: 'tools',
    desc: 'Steal sticker and save with CRYSNOVA AI packname',
    reactions: { start: '👌', success: '😎' },

    execute: async (sock, m, { reply }) => {
        try {
            const quoted = m.quoted ? m.quoted : m;
            const mime = (quoted.msg || quoted).mimetype || '';
            if (!/webp/.test(mime)) return reply('_*⚉ Reply to a sticker.*_');

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

            // Download buffer
            const stream = await downloadContentFromMessage(quoted.msg || quoted, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Create new sticker with packname
            const sticker = new Sticker(buffer, {
                pack: 'CRYSNOVA AI',
                author: 'crysnovax',
                type: 'full'
            });
            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '😎', key: m.key } });
        } catch (err) {
            console.error(err);
            reply('_*✘ Failed to take sticker.*_');
        }
    }
};
