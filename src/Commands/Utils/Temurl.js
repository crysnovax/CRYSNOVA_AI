const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'nurl',
    alias: ['tourl', 'upload'],
    desc: 'Upload replied image to URL',
    category: 'tools',

    execute: async (sock, m, { reply }) => {

        if (!m.quoted)
            return reply('𓉤 ⚉ Reply to an image');

        const mtype = m.quoted.mtype || '';

        if (!mtype.includes('image'))
            return reply('⚉ Reply to an image');

        try {
            await reply('_✪ Uploading image..._');

            const buffer = await m.quoted.download();
            if (!buffer) return reply('✘ Download failed');

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, 'image.jpg'); // Catbox accepts any name

            const result = await axios({
                method: 'POST',
                url: 'https://catbox.moe/user/api.php',
                data: form,
                headers: {
                    ...form.getHeaders(),
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 60000
            });

            const url = result.data?.trim();

            if (!url || !url.startsWith('http')) {
                return reply(`✘ Upload failed\n${url || 'Unknown error'}`);
            }

            reply(`✓ ✪ \`Uploaded Successfully\`\n\n𓄄 ⚉ ${url}`);

        } catch (err) {
            console.log(err.message || err);
            reply(`✘ Upload error: ${err.message || 'Please try again'}`);
        }
    }
};