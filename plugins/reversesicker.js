const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'r',
  alias: ['sticker2img', 'st2img'],
  description: 'Convert replied sticker back to image',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    try {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to a sticker with .r');

      const type = Object.keys(quoted)[0];
      if (type !== 'stickerMessage') return reply('Only stickers supported for .r');

      // Reactions as requested (nice touch!)
      const emojis = ['➕', '📦', '👌', '🚀', '✅'];
      for (const emoji of emojis) {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      }

      reply('Extracting image from sticker...');

      // Download sticker buffer
      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], 'sticker');
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (buffer.length === 0) {
        return reply('Sticker buffer is empty — try another sticker');
      }

      // Convert WebP sticker → PNG with smart cropping + white background
      const output = await sharp(buffer)
        .trim()                                 // remove transparent padding
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }) // upscale if small, no stretch
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // white background (change to { r:0,g:0,b:0,a:0 } for transparent)
        .png({ quality: 95 })                   // high quality PNG
        .toBuffer();

      await sock.sendMessage(m.chat, { image: output, caption: 'Sticker → Image' }, { quoted: m });

      reply('Done! Image extracted from sticker ✅');

    } catch (err) {
      console.error('st2img error:', err.message, err.stack?.substring(0, 200));
      reply(`Error: ${err.message || 'Unknown error'}\nTry a different sticker.`);
    }
  }
};
