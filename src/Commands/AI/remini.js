const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const config = require('../../../settings/config');

// Use gateway from config (same as other AI commands)
const GATEWAY_URL = process.env.GATEWAY_URL || config.api?.gateway || '';

module.exports = {
    name: 'remini',
    alias: ['enhance', 'hd', 'upscale'],
    category: 'AI',
    desc: 'Enhance image quality powered by CRYSNOVA',
    usage: '.remini (reply to image)',

    execute: async (sock, m, { reply, prefix }) => {
        try {
            const quoted = m.quoted;

            if (!quoted || !/image|webp/.test(quoted.mimetype || '')) {
                return reply(`ಠ_ಠ *IMAGE ENHANCER*\n\nReply to an image\nExample: \`${prefix}remini\``);
            }

            await sock.sendPresenceUpdate('composing', m.chat);
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });

            let media = await quoted.download();
            if (!media) return reply('✘ Failed to download image');

            // Compress image
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
            form.append('prompt', 'remini'); // Send as prompt for gateway compatibility

            // Call gateway /changebg endpoint with 'remini' prompt
            const response = await axios.post(
                `${GATEWAY_URL}/changebg`,
                form,
                {
                    headers: form.getHeaders(),
                    responseType: 'arraybuffer',
                    timeout: 180000
                }
            );

            if (!response?.data) return reply('✘ Enhancement failed');

            const result = Buffer.from(response.data);
            if (!result.length) return reply('✘ Enhancement failed');

            await sock.sendMessage(m.chat, {
                image: result,
                caption: `𖣘 *ENHANCED IMAGE*\n\n_⚉ CRYSNOVA Gateway_`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });

        } catch (err) {
            console.log('[REMINI ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '✘', key: m.key } });
            reply('✘ Enhancement failed');
        }
    }
};
