const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  command: 's',
  alias: ['sticker', 'stckr'],
  description: 'Convert replied image or short video to sticker (max 5s)',
  category: 'media',

  execute: async (sock, m, { reply }) => {
    try {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to an image or video with .s');

      const type = Object.keys(quoted)[0];
      if (!['imageMessage','videoMessage'].includes(type)) {
        return reply('Only images or short videos (≤5s) supported');
      }

      reply('Downloading media...');

      let buffer = Buffer.alloc(0);
      const stream = await downloadContentFromMessage(quoted[type], type.startsWith('image') ? 'image' : 'video');
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      if (buffer.length === 0) return reply('Media data is empty — try a fresh file');

      // Reactions first
      for (const emoji of ['➕','📦','👌','🚀','✅']) {
        await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      }

      // convert to sticker
      if (type === 'imageMessage') {
        const webpBuffer = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
          .webp({ quality: 80 })
          .toBuffer();

        await sock.sendMessage(m.chat, { sticker: webpBuffer }, { quoted: m });

      } else if (type === 'videoMessage') {
        // save temp file
        const tmpFile = path.join(__dirname, 'tmp_' + Date.now() + '.mp4');
        fs.writeFileSync(tmpFile, buffer);

        const outFile = path.join(__dirname, 'tmp_' + Date.now() + '.webp');

        // ffmpeg convert video to webp animated sticker (limit 5s)
        const ffmpegCmd = `ffmpeg -y -i "${tmpFile}" -t 5 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -loop 0 "${outFile}"`;
        await execPromise(ffmpegCmd);

        const webpBuffer = fs.readFileSync(outFile);

        await sock.sendMessage(m.chat, { sticker: webpBuffer }, { quoted: m });

        // cleanup
        fs.unlinkSync(tmpFile);
        fs.unlinkSync(outFile);
      }

    } catch (err) {
      console.error('Sticker error:', err.message, err.stack?.substring(0,200));
      reply(`Error: ${err.message || 'Unknown'}\nTry a fresh image or short video ≤5s.`);
    }
  }
};
