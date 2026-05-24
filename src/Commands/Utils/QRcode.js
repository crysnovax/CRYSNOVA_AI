const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const jsQR = require('jsqr');

module.exports = {
    name: 'qr',
    alias: ['qrcode', 'makeqr', 'qrread', 'readqr', 'scanqr', 'deqr'],
    desc: 'Generate QR code from text or read QR from quoted image',
    category: 'tools',
    usage: '.qr <text>   OR   .qrread (reply to QR image)',
    reactions: { start: '📱', success: '✓', error: '⊘' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const cmd = (m.body || '').toLowerCase().split(/\s+/)[0].trim();
        
        // Get the command without the dot
        const command = cmd.replace('.', '');

        // ── GENERATE QR ──────────────────────────────────────────────
        if (['qr', 'qrcode', 'makeqr'].includes(command)) {
            // Check if replying to a message for text
            let text = args.join(' ').trim();
            
            if (!text && m.quoted) {
                // If no args but replying to a message, get quoted message text
                const quotedMsg = m.quoted;
                const quotedText = quotedMsg.message?.conversation || 
                                  quotedMsg.message?.extendedTextMessage?.text ||
                                  quotedMsg.message?.imageMessage?.caption ||
                                  '';
                if (quotedText) {
                    text = quotedText;
                }
            }
            
            if (!text) {
                return reply(`⊘ *Provide text!*\n\nExample: ${prefix}qr https://example.com\nOr reply to a message with ${prefix}qr`);
            }

            await sock.sendMessage(m.chat, { react: { text: '📱', key: m.key } });

            try {
                const buffer = await QRCode.toBuffer(text, {
                    type: 'png',
                    width: 500,
                    margin: 1,
                    errorCorrectionLevel: 'H'
                });

                await sock.sendMessage(m.chat, {
                    image: buffer,
                    mimetype: 'image/png',
                    caption: `📱 *QR Code Generated*\n└ 📝 *Text:* ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });

            } catch (err) {
                console.error('QR generate error:', err);
                await sock.sendMessage(m.chat, { react: { text: '⊘', key: m.key } });
                return reply('⊘ *Failed to generate QR code*');
            }
        }

        // ── READ QR ───────────────────────────────────────────────────
        else if (['qrread', 'readqr', 'scanqr', 'deqr'].includes(command)) {

            // Check if replying to a message
            if (!m.quoted) {
                return reply(
                    `⊘ *Reply to a QR code image!*\n\n` +
                    `📌 *How to use:*\n` +
                    `1️⃣ Send or forward a QR code image\n` +
                    `2️⃣ Reply to that image\n` +
                    `3️⃣ Type ${prefix}qrread\n\n` +
                    `💡 Or use ${prefix}qr to generate a QR code`
                );
            }

            // Get the message type from quoted message
            const quotedMsg = m.quoted;
            const messageContent = quotedMsg.message || {};
            
            // Check if it's an image message
            const isImage = messageContent.imageMessage || 
                           (quotedMsg.mtype && quotedMsg.mtype.includes('image'));
            
            if (!isImage) {
                return reply(`⊘ *Reply to an IMAGE* (not sticker, video, or document)\n\n📌 The QR code must be in image format.`);
            }

            await sock.sendMessage(m.chat, { react: { text: '📱', key: m.key } });

            try {
                // Download the image using the correct method
                let buffer;
                
                // Try different download methods
                if (typeof m.quoted.download === 'function') {
                    buffer = await m.quoted.download();
                } else if (sock.downloadMediaMessage) {
                    buffer = await sock.downloadMediaMessage(quotedMsg);
                } else {
                    throw new Error('Cannot download image');
                }

                if (!buffer || buffer.length === 0) {
                    throw new Error('Empty image data');
                }

                // Load image into canvas
                const img = await loadImage(buffer);
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // Scan for QR code
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const code = jsQR(imageData.data, img.width, img.height, {
                    inversionAttempts: 'attemptBoth'
                });

                if (code && code.data) {
                    await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });
                    return reply(
                        `✓ *QR Code Decoded*\n\n` +
                        `┌ 📦 *Result:*\n` +
                        `│ ${code.data}\n` +
                        `└ 🔍 *Confidence:* ${Math.round(code.confidence)}%`
                    );
                }

                await sock.sendMessage(m.chat, { react: { text: '⊘', key: m.key } });
                return reply(
                    `⊘ *No QR code detected*\n\n` +
                    `📌 *Tips for better results:*\n` +
                    `• Use a clearer / higher-quality image\n` +
                    `• Make sure the QR fills most of the frame\n` +
                    `• Avoid heavy compression or blur\n` +
                    `• Try sending the original image`
                );

            } catch (err) {
                console.error('QR read error:', err);
                await sock.sendMessage(m.chat, { react: { text: '⊘', key: m.key } });
                return reply(`⊘ *Error reading QR code*\n\n└ ${err.message}`);
            }
        }
    }
};
