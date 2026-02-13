const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  command: 'r',
  alias: ['unsticker', 'back'],
  description: 'Convert sticker back to image or video',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    try {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to a sticker with .r to convert back');

      const type = Object.keys(quoted)[0];
      if (!['stickerMessage'].includes(type)) {
        return reply('Only stickers can be reverted (.r)');
      }

      // Reactions
      for (const emoji of ['➕','📦','👌','🚀','✅']) {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      }

      // Ensure tmp folder exists
      const tmpDir = path.join(__dirname, '../tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      // Download sticker
      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], 'sticker');
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length === 0) return reply('Sticker data empty');

      const isAnimated = quoted[type].isAnimated || false;
      const tmpFile = path.join(tmpDir, `sticker_${Date.now()}`);
      let outputFile = '';

      if (isAnimated) {
        fs.writeFileSync(tmpFile + '.webp', buffer);
        outputFile = tmpFile + '.mp4';
        await execPromise(`ffmpeg -y -i "${tmpFile}.webp" -movflags faststart -pix_fmt yuv420p -vf "scale=512:512:flags=lanczos" -t 5 "${outputFile}"`);
      } else {
        const webpBuffer = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
          .png()
          .toBuffer();
        outputFile = tmpFile + '.png';
        fs.writeFileSync(outputFile, webpBuffer);
      }

      await sock.sendMessage(m.chat, { 
        [isAnimated ? 'video' : 'image']: { url: outputFile }, 
        caption: '✅ Reverted sticker',
        mimetype: isAnimated ? 'video/mp4' : 'image/png' 
      }, { quoted: m });

      fs.unlinkSync(outputFile);
      if (isAnimated) fs.unlinkSync(tmpFile + '.webp');

    } catch (err) {
      console.error('Unsticker error:', err.message, err.stack?.substring(0, 200));
      reply(`Error: ${err.message || 'Unknown'}\nTry a different sticker`);
    }
  }
};
