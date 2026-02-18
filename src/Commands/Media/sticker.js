module.exports = {
    name: 'sticker',
    alias: ['s', 'stiker'],
    desc: 'Convert image/video to sticker',
    category: 'Media',
    execute: async (sock, m, { reply, config }) => {
        const quoted = m.quoted || m;
        const mime = quoted.mimetype || '';
        if (!mime) return reply('❌ Reply to an image or short video!');
        if (!/image|video/.test(mime)) return reply('❌ Only image or video!');
        await reply(config.mess.wait);
        try {
            const media = await quoted.download();
            if (/image/.test(mime)) {
                await sock.sendImageAsSticker(m.chat, media, m, {
                    packname: config.sticker.packname,
                    author: config.sticker.author
                });
            } else {
                await sock.sendVideoAsSticker(m.chat, media, m, {
                    packname: config.sticker.packname,
                    author: config.sticker.author
                });
            }
        } catch (e) { await reply(`❌ Failed: ${e.message}`); }
    }
};
