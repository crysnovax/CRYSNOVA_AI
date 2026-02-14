const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = {
  command: 'url',
  description: 'Generate a shareable URL from replied media with premium holographic preview',
  category: 'tools',
  owner: false,

  execute: async (sock, m, { reply }) => {
    try {
      // React immediately
      const reactionMsg = await sock.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });
      setTimeout(async () => {
        await sock.sendMessage(m.key.remoteJid, { delete: reactionMsg.key });
      }, 3000);

      // Get replied media
      const quoted = m.quoted || m.msg?.quoted;
      if (!quoted) return reply('❌ Reply to a media file to generate a URL.');

      const buffer = await sock.downloadMediaMessage(quoted);

      // Save temp
      const tempPath = path.join(__dirname, '..', `temp_media_${Date.now()}`);
      fs.writeFileSync(tempPath, buffer);

      // Upload to ImgBB
      const apiKey = 'a7fc290dcc6bab39fe945c8b581722b4'; // replace with your key
      const form = new FormData();
      form.append('image', fs.createReadStream(tempPath));

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: form
      });

      const data = await res.json();
      fs.unlinkSync(tempPath);

      if (!data.success) return reply('❌ Failed to upload media.');

      const url = data.data.url;

      // Generate holographic canvas
      const width = 1000;
      const height = 400;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Glowing frame
      ctx.strokeStyle = '#00fff0';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00fff0';
      ctx.shadowBlur = 20;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Title
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#00fff0';
      ctx.shadowBlur = 15;
      ctx.fillText('🌐 Media URL Generated', 40, 60);

      // URL text
      ctx.font = '28px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillText(url, 40, 140);

      const imageBuffer = canvas.toBuffer('image/png');

      // Send canvas with button
      await sock.sendMessage(m.key.remoteJid, {
        image: imageBuffer,
        caption: `✅ Media uploaded!\n\nURL:\n${url}`,
        buttons: [
          { buttonId: '.copy', buttonText: { displayText: 'Copy URL' }, type: 1 },
          { buttonId: '.cancel', buttonText: { displayText: 'Cancel' }, type: 1 }
        ],
        headerType: 4
      });

    } catch (err) {
      reply(`❌ Error:\n${err}`);
    }
  }
};
