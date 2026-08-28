const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  name: 'url',
  alias: ['upload', 'mediaurl'],
  category: 'tools',
  desc: 'Upload media and get public URL',
  execute: async (sock, msg, { reply }) => {
    try {
      if (!msg.quoted) return reply('⚉ _*Reply to image/video/audio/document*_');

      const buffer = await msg.quoted.download();
      if (!buffer) return reply('✘ Failed to download media');

      //reply('✪ _*Uploading media...*_');

      const mimetype = msg.quoted.mimetype || 'application/octet-stream';
      const originalName = msg.quoted.fileName;
      const ext = originalName?.includes('.')
        ? originalName.split('.').pop()
        : (mimetype.split('/')[1] || 'bin');

      const form = new FormData();
      form.append('file', buffer, {
        filename: `upload.${ext}`,
        contentType: mimetype
      });

      const res = await axios.post(
        'https://cdn.crysnova.qzz.io/upload',
        form,
        {
          headers: form.getHeaders(),
          timeout: 60000
        }
      );

      if (!res.data?.url) return reply('✘ Media upload failed');

      reply(res.data.url + '\n⚉');
    } catch (error) {
      console.error(error);
      reply('✘ Upload failed');
    }
  }
};
