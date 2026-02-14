const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { exec } = require('child_process');
const Canvas = require('canvas');

module.exports = {
  command: 'murl',
  description: 'Generate permanent URL from replied video',
  category: 'tools',
  owner: false,

  execute: async (sock, m, { reply }) => {
    try {
      // Reaction
      const reactMsg = await sock.sendMessage(m.key.remoteJid, {
        react: { text: '⏳', key: m.key }
      });

      setTimeout(async () => {
        await sock.sendMessage(m.key.remoteJid, { delete: reactMsg.key });
      }, 3000);

      const quoted = m.quoted;
      if (!quoted) return reply('✘ Reply to a video.');

      const type = quoted.mtype || Object.keys(quoted.message || {})[0];
      if (type !== 'videoMessage')
        return reply('𓄄 That is not a video.');

      // Download video
      const buffer = await quoted.download();
      let tempPath = path.join(__dirname, `temp_${Date.now()}.mp4`);
      fs.writeFileSync(tempPath, buffer);

      // Compress (optional but recommended)
      const compressed = tempPath.replace('.mp4', '_c.mp4');
      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i "${tempPath}" -vcodec libx264 -crf 30 "${compressed}"`,
          (err) => (err ? reject(err) : resolve())
        );
      });

      fs.unlinkSync(tempPath);

      // Upload to Catbox
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', fs.createReadStream(compressed));

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form
      });

      const url = await res.text();
      fs.unlinkSync(compressed);

      if (!url.startsWith('https'))
        return reply('𓉤 Upload failed.');

      // Canvas preview
      const canvas = Canvas.createCanvas(900, 350);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 900, 350);

      ctx.strokeStyle = '#00fff0';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#00fff0';
      ctx.shadowBlur = 20;
      ctx.strokeRect(20, 20, 860, 310);

      ctx.font = 'bold 32px Arial';
      ctx.fillStyle = '#00fff0';
      ctx.fillText('🎬 Video URL Generated', 40, 70);

      ctx.font = '24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(url, 40, 140);

      const imageBuffer = canvas.toBuffer('image/png');

      await sock.sendMessage(m.key.remoteJid, {
        image: imageBuffer,
        caption: `✓ Video uploaded successfully\n\n${url}`
      });

    } catch (err) {
      reply(`⚉ Error:\n${err.message}`);
    }
  }
};
