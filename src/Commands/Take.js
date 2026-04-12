const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'take',
    alias: ['steal', 'takesticker', 'takes'],
    category: 'tools',
    desc: 'Steal sticker and save with CRYSNOVA AI packname',
    reactions: { start: '🥏', success: '😎' },

    execute: async (sock, m, { reply }) => {
        try {
            const quoted = m.quoted ? m.quoted : m;
            const mime = (quoted.msg || quoted).mimetype || '';
            if (!/webp/.test(mime)) {
                return reply('_*⚉ Reply to a sticker.*_');
            }

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

            // Download original sticker buffer
            const stream = await downloadContentFromMessage(quoted.msg || quoted, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const originalSizeKB = buffer.length / 1024;

            // Detect if animated (WebP "ANIM" header)
            const isAnimated = buffer.slice(0, 16).toString('hex').includes('414e494d');

            let finalBuffer = buffer;

            // Helper to re-encode with wa-sticker-formatter
            const reencodeWithQuality = async (q) => {
                const sticker = new Sticker(buffer, {
                    pack: 'CRYSNOVA AI',
                    author: 'crysnovax',
                    type: 'full',
                    quality: q
                });
                return await sticker.toBuffer();
            };

            // If already under 500 KB, just add metadata with high quality
            if (originalSizeKB <= 500) {
                finalBuffer = await reencodeWithQuality(80);
            } else {
                // Try decreasing quality
                const qualities = [70, 60, 50, 40, 30];
                for (const q of qualities) {
                    finalBuffer = await reencodeWithQuality(q);
                    if (finalBuffer.length / 1024 <= 500) break;
                }

                // If still too big and animated, use ffmpeg
                if (finalBuffer.length / 1024 > 500 && isAnimated) {
                    const tempDir = path.join(__dirname, '../../temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                    const inputPath = path.join(tempDir, `take_${Date.now()}.webp`);
                    const outputPath = path.join(tempDir, `take_out_${Date.now()}.webp`);

                    fs.writeFileSync(inputPath, buffer);

                    const cmd = `ffmpeg -y -i "${inputPath}" -vf "fps=8,scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p" -c:v libwebp -lossless 0 -q:v 30 -loop 0 -an -preset default -compression_level 6 "${outputPath}"`;

                    await new Promise((resolve, reject) => {
                        exec(cmd, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    finalBuffer = fs.readFileSync(outputPath);

                    // Cleanup temp files
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);

                    // Apply metadata to compressed buffer
                    if (finalBuffer.length / 1024 <= 500) {
                        const sticker = new Sticker(finalBuffer, {
                            pack: 'CRYSNOVA AI',
                            author: 'crysnovax',
                            type: 'full',
                            quality: 30
                        });
                        finalBuffer = await sticker.toBuffer();
                    }
                }

                // Final check
                if (finalBuffer.length / 1024 > 500) {
                    await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                    return reply('_*✘ Sticker too complex to fit WhatsApp limit even after compression.*_');
                }
            }

            await sock.sendMessage(m.chat, { sticker: finalBuffer }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '😎', key: m.key } });

        } catch (err) {
            console.error('TAKE ERROR:', err);
            reply('_*✘ Failed to take sticker.*_');
        }
    }
};
