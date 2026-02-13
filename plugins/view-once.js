const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'vv',
  alias: ['viewonce', 'vview'],
  description: 'Download view-once media',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    try {
      let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to a view-once message with .vv');

      // Unwrap ephemeralMessage if present
      if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;

      const type = Object.keys(quoted)[0];
      const supported = ['imageMessage', 'videoMessage', 'stickerMessage'];
      if (!supported.includes(type)) return reply('Only view-once images, videos, stickers are supported');

      // --- Premium reactions ---
      for (const emoji of ['➕','📦','👌','🚀','✅']) {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      }

      const tmpDir = path.join(__dirname, '../tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      // Download media
      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], type.replace('Message','').toLowerCase());
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      if (!buffer || buffer.length === 0) return reply('Failed to download media');

      // Determine extension
      const extMap = { imageMessage: 'jpg', videoMessage: 'mp4', stickerMessage: 'webp' };
      const ext = extMap[type] || 'bin';
      const tmpFile = path.join(tmpDir, `viewonce_${Date.now()}.${ext}`);
      fs.writeFileSync(tmpFile, buffer);

      // Send back media
      await sock.sendMessage(m.chat, {
        [type === 'videoMessage' ? 'video' : type === 'imageMessage' ? 'image' : 'sticker']: { url: tmpFile },
        caption: '✅ View-once media downloaded',
        mimetype: quoted[type].mimetype
      }, { quoted: m });

      fs.unlinkSync(tmpFile);

    } catch (err) {
      console.error('View-once download error:', err.message);
      reply(`Error: ${err.message || 'Unknown'}\nMake sure it’s a view-once message`);
    }
  }
};
