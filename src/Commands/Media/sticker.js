const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Sticker } = require('wa-sticker-formatter'); // 👈 added

module.exports = {
    name: 'sticker',
    alias: ['s','stick'],
    category: 'Media',

    execute: async (sock, m, { reply }) => {

        const quoted = m.quoted || m;
        const mime = quoted.mimetype || '';

        if (!/image|video/.test(mime))
            return reply('⚉ Reply to image or video');

        try {
            const media = await quoted.download();

            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true });

            const input = path.join(tempDir, `stk_${Date.now()}`);
            const output = input + '.webp';

            fs.writeFileSync(input, media);

            // ================= VIDEO STICKER =================
            if (/video/.test(mime)) {
                const duration = (quoted.msg || quoted).seconds || 0;
                if (duration < 1 || duration > 60) {
                    fs.unlinkSync(input);
                    return reply('✘ Video must be between 1s and 60s');
                }

                const videoCmd = `ffmpeg -y -i "${input}" -t 5 -vf "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p" -c:v libwebp -lossless 0 -q:v 80 -loop 0 -an "${output}"`;
                await new Promise((resolve, reject) => {
                    exec(videoCmd, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            // ================= IMAGE STICKER =================
            else {
                const imageCmd = `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p" -c:v libwebp -lossless 0 -q:v 80 -an "${output}"`;
                await new Promise((resolve, reject) => {
                    exec(imageCmd, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // 👇 Read the generated webp
            let buffer = fs.readFileSync(output);

            // 👇 Add packname & author using wa-sticker-formatter
            const sticker = new Sticker(buffer, {
                pack: 'CRYSNOVA AI',
                author: 'crysnovax',
                type: 'full'
            });
            buffer = await sticker.toBuffer(); // re‑encoded with metadata

            // Send the sticker
            await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m });

            // Cleanup
            fs.unlinkSync(input);
            if (fs.existsSync(output)) fs.unlinkSync(output);

        } catch (e) {
            reply(`✘ Failed: ${e.message}`);
        }
    }
};
