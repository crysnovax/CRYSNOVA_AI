const QRCode  = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const jsQR    = require('jsqr');

module.exports = {
    name: 'qr',
    alias: ['qrcode', 'makeqr', 'qrread', 'readqr', 'scanqr', 'deqr'],
    desc: 'Generate QR code from text or read QR from quoted image',
    category: 'tools',
    usage: '.qr <text>   OR   .qrread (reply to QR image)',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const cmd = (m.body || '').toLowerCase().split(/\s+/)[0].trim();

        // ── GENERATE QR ──────────────────────────────────────────────
        if (['.qr', '.qrcode', '.makeqr'].includes(cmd)) {
            const text = args.join(' ').trim();
            if (!text) return reply('Provide text!\nExample: .qr https://example.com');

            try {
                const buffer = await QRCode.toBuffer(text, {
                    type: 'png',
                    width: 500,
                    margin: 1,
                    errorCorrectionLevel: 'H'
                });

                await sock.sendMessage(m.key.remoteJid, {
                    image: buffer,
                    mimetype: 'image/png'
                }, { quoted: m });

            } catch (err) {
                console.error('QR generate error:', err);
                return reply('✘ Failed to generate QR code');
            }
        }

        // ── READ QR ───────────────────────────────────────────────────
        else if (['.qrread', '.readqr', '.scanqr', '.deqr'].includes(cmd)) {

            // 1. Must be a reply
            if (!m.quoted) {
                return reply(
                    '✘ Reply to a QR code image!\n\n' +
                    'How: Send a QR image → reply to it → type .qrread.  ⚉'
                );
            }

            // 2. Check type — serialize.js puts the type in m.quoted.mtype
            //    It will be 'imageMessage' for images
            const mtype = m.quoted.mtype || '';
            if (!mtype.includes('image')) {
                return reply('✘ Reply to an *image* (not sticker/video/document)');
            }

            try {
                // ✅ THE FIX:
                // serialize.js line 91 gives us m.quoted.download() — use it directly.
                // DO NOT use downloadMediaMessage(quoted) — quoted is unwrapped content,
                // not a full Baileys { key, message } object, so it will always fail.
                const buffer = await m.quoted.download();

                if (!buffer || !buffer.length) {
                    return reply('𓄄 Could not download the image. Try again.');
                }

                // Load into canvas and scan
                const img    = await loadImage(buffer);
                const canvas = createCanvas(img.width, img.height);
                const ctx    = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);

                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const code = jsQR(imageData.data, img.width, img.height, {
                    inversionAttempts: 'attemptBoth'
                });

                if (code?.data) {
                    return reply(`✓ _*QR Decoded:*_\n\n${code.data}`);
                }

                return reply(
                    '_⚉ No QR code detected_.\n\n' +
                    '• Try a clearer / higher-quality image\n' +
                    '• Make sure the QR fills most of the frame\n' +
                    '• Avoid heavy compression or blur'
                );

            } catch (err) {
                console.error('QR read error:', err.message || err);
                return reply(`✘ Error reading QR:\n${err.message}`);
            }
        }

        // ── HELP ─────────────────────────────────────────────────────
        else {
            return reply(
                '*QR Code Commands:*\n\n' +
                '`.qr <text>` — generate QR image\n' +
                '`.qrread` — decode QR (reply to image)'
            );
        }
    }
};
