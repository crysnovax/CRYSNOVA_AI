const QRCode = require('qrcode');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'qr',
  alias: ['qrcode', 'qrread'],
  description: 'Generate or read QR codes',
  category: 'utility',

  execute: async (sock, m, { reply, text, args }) => {
    try {
      // --- QR GENERATE ---
      if (m.text.startsWith('.qr ') || m.text.startsWith('.qrcode ')) {
        if (!text) return reply('Provide text to convert to QR code');

        const buffer = await QRCode.toBuffer(text, { type: 'png', width: 512 });
        await sock.sendMessage(m.chat, { image: buffer, caption: 'Here’s your QR code!' }, { quoted: m });
        return;
      }

      // --- QR READ ---
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to an image QR code with .qrread');

      const type = Object.keys(quoted)[0];
      if (type !== 'imageMessage') return reply('Only images are supported for reading QR codes');

      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], 'image');
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const image = await Jimp.read(buffer);
      const qrCode = jsQR(new Uint8ClampedArray(image.bitmap.data), image.bitmap.width, image.bitmap.height);

      if (!qrCode) return reply('Could not read QR code from image.');
      reply(`QR Code content:\n${qrCode.data}`);

    } catch (err) {
      console.error('QR plugin error:', err);
      reply(`Error: ${err.message || 'Unknown error'}`);
    }
  }
};
