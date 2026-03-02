const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = {
    name: 'imagine',
    alias: ['gi', 'create'],
    desc: 'Edit image using AI',
    category: 'ai',
    usage: '.gptimage <prompt> (reply to image/sticker)',

    execute: async (sock, m, { args, reply, prefix }) => {

        try {

            const quoted = m.quoted;

            if (!quoted)
                return reply(
                    '𓉤 ⚉ Reply to an image or sticker\n\n' +
                    `𓄄 ✪ \`${prefix}gptimage make it cinematic\``
                );

            if (!/image|webp/.test(quoted.mimetype || ''))
                return reply('✘ ⚉ Reply must be an image or static sticker');

            const prompt = args.join(' ').trim();
            if (!prompt)
                return reply(
                    '✘ ⚉ Provide a prompt\n\n' +
                    `𓄄 ✪ \`${prefix}gptimage change background to beach\``
                );

            await sock.sendPresenceUpdate('composing', m.chat);

            // Download media
            let media = await quoted.download();
            if (!media)
                return reply('✘ ⚉ Failed to download media');

            // ===== Auto Compression (Prevents 413 Error) =====
            if (Buffer.isBuffer(media)) {
                try {
                    media = await sharp(media)
                        .resize({
                            width: 1024,
                            height: 1024,
                            fit: 'inside'
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                } catch (e) {
                    console.log('Compression skipped:', e.message);
                }
            }

            const form = new FormData();
            form.append('image', media, {
                filename: 'image.jpg'
            });

            form.append('param', prompt);

            const response = await axios.post(
                'https://api.nexray.web.id/ai/gptimage',
                form,
                {
                    headers: {
                        ...form.getHeaders()
                    },
                    responseType: 'arraybuffer',
                    timeout: 180000
                }
            );

            if (!response?.data)
                return reply('✘ ⚉ No image returned from AI');

            const result = Buffer.from(response.data);

            if (!result.length)
                return reply('✘ ⚉ Empty image received');

            const maxSize = 5 * 1024 * 1024;

            if (result.length > maxSize) {
                return reply('𓉤 ⚉ Result exceeds WhatsApp 5MB limit');
            }

            await sock.sendMessage(m.chat, {
                image: result,
                caption:
                    `✓ ✪ \`Image edited successfully\`\n\n` +
                    `𓄄 ⚉ Prompt:\n<${prompt}>`
            }, { quoted: m });

        } catch (err) {

            console.error('[GPTIMAGE ERROR]', err);

            if (err.response?.status === 413)
                return reply('𓉤 ⚉ Image too large — compression failed');
            if (err.response?.status === 429)
                return reply('𓉤 ⚉ Rate limit exceeded');
            if (err.response?.status === 500)
                return reply('𓉤 ⚉ AI server unavailable');
            if (err.code === 'ECONNABORTED')
                return reply('𓉤 ⚉ Processing timeout');

            reply(`✘ ⚉ <${err.message || 'Unknown error'}>`);
        }
    }
};