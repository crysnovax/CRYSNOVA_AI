const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function runFfmpeg(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    name: 'webp',
    alias: ['emoji', 'tgemoji'],
    desc: 'Convert an image or GIF to Telegram custom-emoji spec (100x100 WEBP, or WEBM for animated).',
    category: 'tools',
    usage: 'Reply to image + .webp\nReply to GIF + .webp',
    owner: false,

    execute: async (sock, m, { reply }) => {
        if (!m.quoted) {
            return reply('*𓉤 Reply to an image or GIF to convert it to Telegram emoji spec!*');
        }

        const quoted = m.quoted;
        const mtype = quoted.mtype || quoted.type || '';

        const isVideoType = mtype.includes('video');
        const isGifPlayback = !!(quoted.gifPlayback || quoted.msg?.gifPlayback);
        const isImageType = mtype.includes('image');

        if (!isImageType && !isVideoType) {
            return reply('⚉ Reply to an *image* or *GIF* (not video/sticker/doc)');
        }

        if (isVideoType && !isGifPlayback) {
            return reply('⚉ This looks like a regular video, not a GIF. .webp supports GIFs and images only.');
        }

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const stamp = Date.now();

        // ── ANIMATED PATH (GIF → Telegram emoji WEBM) ──
        // Spec: 100x100, VP9, <=3s, <=30fps, no audio, <=256KB
        if (isVideoType && isGifPlayback) {
            try {
                await reply('_*✪ Converting GIF to Telegram emoji WEBM...*_');

                const buffer = await quoted.download();
                if (!buffer || buffer.length < 100) {
                    return reply('_*✘ Failed to download GIF*_');
                }

                const input = path.join(tempDir, `webpin_${stamp}.mp4`);
                const output = path.join(tempDir, `webpout_${stamp}.webm`);
                fs.writeFileSync(input, buffer);

                // Force 100x100 square (crop to center square first, then scale),
                // cap at 3s, 30fps, strip audio, VP9 codec.
                // NOTE: this does not auto-strip background — source must already
                // have alpha if transparency is wanted, matching resize.js precedent
                // of not guessing at background removal.
                const cmdStr = `ffmpeg -y -i "${input}" -t 3 -vf "crop='min(iw,ih)':'min(iw,ih)',scale=100:100:flags=lanczos,fps=30" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 200k -crf 32 -an "${output}"`;

                await runFfmpeg(cmdStr);

                if (!fs.existsSync(output)) {
                    fs.unlinkSync(input);
                    return reply('𓄄 Conversion failed — no output produced');
                }

                let outStat = fs.statSync(output);

                // If over the 256KB cap, do one re-encode pass at a lower bitrate
                // rather than looping indefinitely — predictable, single retry.
                if (outStat.size > 256 * 1024) {
                    const output2 = path.join(tempDir, `webpout2_${stamp}.webm`);
                    const cmdStr2 = `ffmpeg -y -i "${input}" -t 3 -vf "crop='min(iw,ih)':'min(iw,ih)',scale=100:100:flags=lanczos,fps=30" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 90k -crf 40 -an "${output2}"`;
                    await runFfmpeg(cmdStr2);
                    if (fs.existsSync(output2)) {
                        fs.unlinkSync(output);
                        fs.renameSync(output2, output);
                        outStat = fs.statSync(output);
                    }
                }

                const outBuffer = fs.readFileSync(output);
                const finalKB = Math.round(outBuffer.length / 1024);
                const overCap = outBuffer.length > 256 * 1024;

                await sock.sendMessage(m.chat, {
                    document: outBuffer,
                    mimetype: 'video/webm',
                    fileName: `emoji_${stamp}.webm`,
                    caption: `𓉤 Telegram emoji WEBM ready — 100x100, ${finalKB}KB${overCap ? ' (⚠ still over 256KB cap, Telegram may reject)' : ''}\nUpload this file directly to @Stickers on Telegram.`
                }, { quoted: m });

                fs.unlinkSync(input);
                fs.unlinkSync(output);
                return;

            } catch (err) {
                console.error('[WEBP GIF ERROR]', err.message || err);
                return reply('𓄄 Failed to convert GIF\n' + (err.message || 'Unknown error'));
            }
        }

        // ── STATIC IMAGE PATH (image → Telegram emoji WEBP) ──
        // Spec: exactly 100x100, PNG or WEBP
        try {
            await reply('_*✪ Converting image to Telegram emoji WEBP...*_');

            const buffer = await m.quoted.download();
            if (!buffer || buffer.length < 100) {
                return reply('_*✘ Failed to download image*_');
            }

            const image = sharp(buffer);
            const metadata = await image.metadata();
            const origWidth = metadata.width;
            const origHeight = metadata.height;
            const hadAlpha = !!metadata.hasAlpha;

            // Center-crop to square first (like resize.js's "square" mode),
            // then force to exactly 100x100. No background stripping —
            // if source has no alpha, output will not have transparency either.
            const size = Math.min(origWidth, origHeight);
            const left = Math.round((origWidth - size) / 2);
            const top = Math.round((origHeight - size) / 2);

            const outputBuffer = await image
                .extract({ left, top, width: size, height: size })
                .resize(100, 100, { kernel: sharp.kernel.lanczos3 })
                .webp({ quality: 100, lossless: false })
                .toBuffer();

            await sock.sendMessage(m.chat, {
                document: outputBuffer,
                mimetype: 'image/webp',
                fileName: `emoji_${stamp}.webp`,
                caption: `𓉤 Telegram emoji WEBP ready — 100x100${hadAlpha ? '' : '\n⚠ Source had no transparency — background was preserved as-is. Pre-transparent your source if you want a clear background.'}\nUpload this file directly to @Stickers on Telegram.`
            }, { quoted: m });

        } catch (err) {
            console.error('[WEBP ERROR]', err.message || err);
            await reply('𓄄 Failed to convert image\n' + (err.message || 'Unknown error'));
        }
    }
};

