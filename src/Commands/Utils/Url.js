const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'url',
    alias: ['geturl', 'mediaurl', 'link'],
    desc: 'Generate direct URL for replied media (image/video/sticker/doc/audio)',
    category: 'tools',
    usage: '.url (reply to any media)',
    owner: false,

    execute: async (sock, m, { reply }) => {
        // 1. Must be a reply
        if (!m.quoted) {
            return reply('✘ Reply to an image, video, sticker, document or audio with .url');
        }

        const quoted = m.quoted;
        const mtype = quoted.mtype || quoted.type || '';

        // Supported media types
        const supported = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage', 'audioMessage'];
        if (!supported.some(t => mtype.includes(t))) {
            return reply('*✘ Reply to a supported media*:\nImage, Video, Sticker, Document, Audio');
        }

        try {
            await reply('_*✪ Uploading media...*_');

            // Download using your serializer's .download() method
            const buffer = await m.quoted.download();

            if (!buffer || buffer.length < 100) {
                return reply('_*𓉤 Failed to download media. Try again.*_');
            }

            // Prepare FormData for catbox.moe (free, no key, reliable)
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, {
                filename: `media_${Date.now()}.${mtype.includes('video') ? 'mp4' : 'jpg'}`,
                contentType: mtype.includes('video') ? 'video/mp4' : 'image/jpeg'
            });

            // Upload to catbox.moe
            const res = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 60000
            });

            const url = res.data.trim();

            if (!url.startsWith('https://files.catbox.moe/')) {
                throw new Error('Invalid response from upload service');
            }

            // Send the clean URL
            await reply(
                `✨ *Direct URL generated!*\n\n` +
                `${url}\n\n` +
                `_Copy & share — expires never (unless abused)_`
            );

        } catch (err) {
            console.error('[URL UPLOAD ERROR]', err.message || err);
            await reply(
                '_*✘ Failed to generate*_ URL\n\n' +
                'Possible reasons:\n' +
                '• Media too large (>100MB)\n' +
                '• Network issue\n' +
                '• Try again in a minute'
            );
        }
    }
};
