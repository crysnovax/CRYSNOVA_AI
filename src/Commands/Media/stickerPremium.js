const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'sprem',
    alias: ['stickerprem', 'spremium'],
    category: 'Media',

    execute: async (sock, m, { reply }) => {
        const quoted = m.quoted || m;
        const mime = quoted.mimetype || '';

        if (!/image|video/.test(mime)) {
            return reply('⚉ Reply to an image or video');
        }

        try {
            const media = await quoted.download();

            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const input = path.join(tempDir, `sprem_${Date.now()}`);
            const output = input + '.webp';

            fs.writeFileSync(input, media);

            // ================= VIDEO STICKER =================
            if (/video/.test(mime)) {
                const duration = (quoted.msg || quoted).seconds || 0;
                if (duration < 1 || duration > 5) {
                    fs.unlinkSync(input);
                    return reply('✘ Video must be between 1s and 5s');
                }

                const compressVideo = async (fps, quality) => {
                    const cmd = `ffmpeg -y -i "${input}" -t 5 -vf "fps=${fps},scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p" -c:v libwebp -lossless 0 -q:v ${quality} -loop 0 -an -preset default -compression_level 6 "${output}"`;
                    await new Promise((resolve, reject) => {
                        exec(cmd, (err) => err ? reject(err) : resolve());
                    });
                    return fs.statSync(output).size / 1024;
                };

                let sizeKB = await compressVideo(12, 70);
                if (sizeKB > 500) sizeKB = await compressVideo(8, 40);
                if (sizeKB > 500) {
                    fs.unlinkSync(input);
                    fs.unlinkSync(output);
                    return reply('✘ Video too complex to fit WhatsApp sticker limit. Try a shorter/simpler clip.');
                }
            }
            // ================= IMAGE STICKER =================
            else {
                const imageCmd = `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p" -c:v libwebp -lossless 0 -q:v 80 -an "${output}"`;
                await new Promise((resolve, reject) => {
                    exec(imageCmd, (err) => err ? reject(err) : resolve());
                });
            }

            // Read the generated WebP
            let buffer = fs.readFileSync(output);

            // Add metadata using wa-sticker-formatter
            const sticker = new Sticker(buffer, {
                pack: 'CRYSNOVA AI',
                author: 'crysnovax',
                type: 'full',
                quality: 70
            });
            buffer = await sticker.toBuffer();

            // Send as premium sticker — shows 💎 badge
            await sock.sendMessage(m.chat, {
                sticker: buffer,
                premium: 1
            }, { quoted: m });

            // Cleanup
            fs.unlinkSync(input);
            if (fs.existsSync(output)) fs.unlinkSync(output);

        } catch (e) {
            console.error(e);
            reply(`✘ Failed: ${e.message}`);
        }
    }
};

