const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');

module.exports = {
  command: 'qrread',
  alias: ['readqr', 'scanqr'],
  description: 'Read QR code from an image',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return reply('Reply to a QR image to scan it.');

    const type = Object.keys(quoted)[0];
    if (type !== 'imageMessage') return reply('Only images are supported.');

    try {
      // Download image
      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], 'image');
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const img = await loadImage(buffer);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imageData.data, img.width, img.height);

      if (code) {
        reply(`QR Code content:\n\`\`\`${code.data}\`\`\``);
      } else {
        reply('No QR code detected in the image. ✘');
      }
    } catch (err) {
      console.error('QR read error:', err);
      reply('Failed to read QR code. 😢');
    }
  }
};
