const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = {
  command: 's',
  alias: ['sticker', 'stckr'],
  description: 'Convert replied image to sticker (send fresh photo)',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    try {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to an image with .s or .sticker');

      const type = Object.keys(quoted)[0];
      if (type !== 'imageMessage') {
        return reply('Only images supported right now (video/GIF coming soon)');
      }

      reply('Downloading image...');

      let buffer = Buffer.alloc(0);
      try {
        const stream = await downloadContentFromMessage(quoted[type], 'image');

        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
      } catch (downloadErr) {
        console.error('Download failed:', downloadErr.message);
        return reply('Failed to download image.\nSend a brand new photo from camera and try again.');
      }

      if (buffer.length === 0) {
        return reply('Image data is empty — WhatsApp did not provide the file.\nTry a fresh camera photo.');
      }

      // --- REACTIONS INSTEAD OF TEXT ---
      for (const emoji of ['➕','📦','👌','🚀','✅']) {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      }

      // --- CONVERT TO STICKER ---
      const webpBuffer = await sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer();

      await sock.sendMessage(
        m.chat,
        { sticker: webpBuffer },
        { quoted: m }
      );

    } catch (err) {
      console.error('Sticker error:', err.message, err.stack?.substring(0, 200));
      reply(`Error: ${err.message || 'Unknown'}\nTry a different fresh image.`);
    }
  }
};
