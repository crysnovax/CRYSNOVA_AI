const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'take',
    alias: ['steal', 'takesticker'],
    category: 'tools',
    desc: 'Steal sticker and save with CRYSNOVA AI packname',

    reactions: {
        start: '👌',
        success: '😎'
    },

    execute: async (sock, m, { reply }) => {
        try {

            const quoted = m.quoted ? m.quoted : m;
            const mime = (quoted.msg || quoted).mimetype || '';

            if (!/webp/.test(mime)) {
                return reply('_*⚉ reply to a sticker.*_');
            }

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

            const stream = await downloadContentFromMessage(quoted.msg || quoted, 'sticker');
            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(
                m.chat,
                {
                    sticker: buffer,
                    packname: 'CRYSNOVA AI',
                    author: 'CRYSNOVA'
                },
                { quoted: m }
            );

            await sock.sendMessage(m.chat, { react: { text: '😎', key: m.key } });

        } catch (err) {
            console.error('TAKE ERROR:', err);
            reply('_*✘ Failed to take sticker.*_');
        }
    }
};