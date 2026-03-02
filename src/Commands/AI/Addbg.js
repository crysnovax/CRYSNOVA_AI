const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'newbg',
    alias: ['addbg',],
    desc: 'Smart AI background changer (remove bg → add bg)',
    category: 'ai',
    usage: '.changebg <background prompt> (reply image)',

    execute: async (sock, m, { args, reply, prefix }) => {

        try {

            if (!m.quoted)
                return reply(`✘ Reply to an image\nExample: ${prefix}changebg beach`);

            const prompt = args.join(' ').trim();
            if (!prompt)
                return reply(`✘ Provide background description\nExample: ${prefix}changebg beach sunset`);

            const quoted = m.quoted;

            if (!/image|webp/.test(quoted.mimetype || ''))
                return reply('✘ Reply must be an image');

            await reply('✦ Processing image, please wait...');

            // ===============================
            // STEP 1 — Remove Background
            // ===============================

            const buffer = await quoted.download();

            const form = new FormData();
            form.append('image_file', buffer, {
                filename: 'image.jpg',
                contentType: 'image/jpeg'
            });
            form.append('size', 'auto');

            const removeBgResponse = await axios.post(
                'https://api.remove.bg/v1.0/removebg',
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        'X-Api-Key': 'wPFjD5dk6JXo6P5UoxtH6dJW'
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000
                }
            );

            const transparentImage = Buffer.from(removeBgResponse.data);

            if (!transparentImage || transparentImage.length < 100)
                return reply('✘ Background removal failed');

            // ===============================
            // STEP 2 — AI Add New Background
            // ===============================

            const aiForm = new FormData();
            aiForm.append('image', transparentImage, {
                filename: 'transparent.png'
            });

            aiForm.append('param', prompt);

            const aiResponse = await axios.post(
                'https://api.nexray.web.id/ai/gptimage',
                aiForm,
                {
                    headers: {
                        ...aiForm.getHeaders()
                    },
                    responseType: 'arraybuffer',
                    timeout: 180000
                }
            );

            if (!aiResponse?.data)
                return reply('✘ AI background generation failed');

            const finalImage = Buffer.from(aiResponse.data);

            if (!finalImage.length)
                return reply('✘ Empty AI result');

            if (finalImage.length > 5 * 1024 * 1024)
                return reply('✘ Result exceeds WhatsApp 5MB limit');

            await sock.sendMessage(m.chat, {
                image: finalImage,
                caption:
                    `✓ Background changed successfully\n\n` +
                    `✦ Prompt:\n<${prompt}>`
            }, { quoted: m });

        } catch (err) {

            console.error('[CHANGE BG ERROR]', err);

            if (err.response?.status === 402)
                return reply('✘ Remove.bg credits exhausted');

            if (err.response?.status === 401)
                return reply('✘ Invalid remove.bg API key');

            if (err.code === 'ECONNABORTED')
                return reply('✘ Processing timeout');

            reply(`✘ Error: ${err.message}`);
        }
    }
};