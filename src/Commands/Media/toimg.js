module.exports = {
    name: 'toimg',
    alias: ['toimage', 'stickertoimg'],
    desc: 'Convert sticker to image',
    category: 'Media',
    execute: async (sock, m, { reply }) => {
        const quoted = m.quoted || m;
        if (!/webp/.test(quoted.mimetype || '')) return reply('❌ Reply to a sticker!');
        try {
            const media = await quoted.download();
            await sock.sendMessage(m.chat, { image: media, caption: '✅ Sticker converted to image' }, { quoted: m });
        } catch (e) { await reply(`❌ Failed: ${e.message}`); }
    }
};
