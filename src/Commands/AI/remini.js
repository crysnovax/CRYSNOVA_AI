const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

module.exports = {
    name: 'remini',
    alias: ['enhance','hd'],
    category: 'ai',
    usage: '.remini (reply image)',

    execute: async (sock, m, { reply, prefix }) => {

        try {

            const quoted = m.quoted;

            if (!quoted || !/image|webp/.test(quoted.mimetype || '')) {
                return reply(
                    'Reply to an image\n\n' +
                    `Example: ${prefix}remini`
                );
            }

            await sock.sendPresenceUpdate('composing', m.chat);

            let media = await quoted.download();
            if (!media) return reply('Failed to download image');

            // Compress image (like your changebg plugin)
            try {
                media = await sharp(media)
                    .resize({
                        width: 1024,
                        height: 1024,
                        fit: 'inside'
                    })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            } catch {}

            const form = new FormData();
            form.append('image', media, { filename: 'image.jpg' });
            form.append('param', 'remini');

            const response = await axios.post(
                'https://api.nexray.web.id/ai/gptimage',
                form,
                {
                    headers: form.getHeaders(),
                    responseType: 'arraybuffer',
                    timeout: 180000
                }
            );

            if (!response?.data)
                return reply('✘ Enhancement failed');

            const result = Buffer.from(response.data);

            if (!result.length)
                return reply('✘ Enhancement failed');

            await sock.sendMessage(m.chat, {
                image: result,
                caption: '☬ Image enhanced successfully'
            }, { quoted: m });

        } catch (err) {
            console.log('[REMINI ERROR]', err.message);
            reply('✘ Enhancement failed');
        }
    }
};