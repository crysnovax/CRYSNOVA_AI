const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = {
    name: 'url',
    alias: ['geturl', 'sharelink', 'mediaurl'],
    desc: 'Upload replied media and generate direct shareable URL with holographic preview',
    category: 'tools',
    usage: '.url (reply to image/video/sticker/audio/doc)',
    owner: false,

    execute: async (sock, m, { prefix, config, reply }) => {
        try {
            // React with loading
            await sock.sendMessage(m.chat, { 
                react: { text: '⏳', key: m.key } 
            });

            // Get replied media
            if (!m.quoted) {
                return reply('⚉ _*Reply to a media file*_ (image/video/sticker/etc.) _*to generate URL*_');
            }

            const buffer = await m.quoted.download();
            if (!buffer || buffer.length < 1000) {
                return reply('𓉤 *Failed to download media from WhatsApp*');
            }

            // Save temp file
            const tempPath = path.join(__dirname, `temp_media_${Date.now()}`);
            fs.writeFileSync(tempPath, buffer);

            // Upload to ImgBB
            const apiKey = 'a7fc290dcc6bab39fe945c8b581722b4'; // your friend's key — change if needed
            const form = new FormData();
            form.append('image', fs.createReadStream(tempPath));

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: form
            });

            const data = await res.json();
            fs.unlinkSync(tempPath); // clean up

            if (!data.success) {
                return reply('✘ *Failed to upload media to ImgBB*');
            }

            const url = data.data.url;

            // ── Generate holographic canvas preview ────────────────────────
            const width = 1000;
            const height = 400;
            const canvas = Canvas.createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Dark background
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);

            // Glowing neon frame
            ctx.strokeStyle = '#00fff0';
            ctx.lineWidth = 6;
            ctx.shadowColor = '#00fff0';
            ctx.shadowBlur = 20;
            ctx.strokeRect(20, 20, width - 40, height - 40);

            // Title
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#00fff0';
            ctx.shadowBlur = 15;
            ctx.fillText('🌐 CRYSNOVA MEDIA URL', 40, 80);

            // URL text
            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.fillText(url.substring(0, 60) + '...', 40, 160);

            // Bot branding
            ctx.font = '24px Arial';
            ctx.fillStyle = '#00fff0';
            ctx.fillText('CRYSN⚉VA AI V2.0', 40, height - 40);

            const imageBuffer = canvas.toBuffer('image/png');

            // Send holographic preview + buttons
            await sock.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `✓ _*Media uploaded successfully!*_\n\n🔗 Direct URL:\n${url}\n\nCopy & share — permanent link`,
                buttons: [
                    { buttonId: 'copy_url', buttonText: { displayText: 'Copy URL' }, type: 1 },
                    { buttonId: 'cancel_url', buttonText: { displayText: 'Cancel' }, type: 1 }
                ],
                headerType: 4,
                contextInfo: {
                    externalAdReply: {
                        title: "CRYSN⚉VA AI Media Share",
                        body: "Direct link generated",
                        thumbnailUrl: config.thumbUrl || 'https://i.imgur.com/BoN9kdC.png',
                        sourceUrl: url,
                        mediaType: 1
                    }
                }
            }, { quoted: m });

        } catch (err) {
            console.error('[URL PLUGIN ERROR]', err.message || err);
            await reply(` ✘Error generating URL:\n${err.message || 'Unknown error'}`);
        }
    }
};