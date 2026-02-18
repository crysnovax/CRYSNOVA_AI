const sharp = require('sharp');

module.exports = {
    name: 'media-editor',
    alias: ['upscale', 'blur', 'pixel', 'glow', 'red', 'gray', 'invert'],
    desc: 'Edit replied image: upscale, blur, pixelate, glow, red tint, gray, invert',
    category: 'tools',
    usage: 'Reply to image + .upscale | .blur | .pixel 18 | .glow | .red | .gray | .invert',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        // Must reply to a message
        if (!m.quoted) {
            return reply('*𓉤 Reply to an image to edit it!*');
        }

        const quoted = m.quoted;
        const mtype = quoted.mtype || quoted.type || '';

        if (!mtype.includes('image')) {
            return reply('⚉ Reply to an *image* (not video/sticker/doc)');
        }

        try {
            await reply('_*✪ Editing image...*_');

            // Download image
            const buffer = await m.quoted.download();
            if (!buffer || buffer.length < 100) {
                return reply('_*✘ Failed to download image*_');
            }

            let image = sharp(buffer);

            // Get command
            const cmd = m.body.toLowerCase().split(/\s+/)[0].slice(1); // remove .
            let outputBuffer;

            switch (cmd) {
                case 'upscale':
                    // 2x upscale + sharpen
                    image = image.resize({ width: null, height: null, factor: 2 }).sharpen();
                    break;

                case 'blur':
                    image = image.blur(5); // moderate blur
                    break;

                case 'pixel':
                    const pixelSize = parseInt(args[0]) || 18;
                    if (pixelSize < 2 || pixelSize > 100) {
                        return reply('Pixel size must be between 2 and 100');
                    }
                    // Pixelate effect
                    const metadata = await image.metadata();
                    image = image.resize({
                        width: Math.floor(metadata.width / pixelSize),
                        height: Math.floor(metadata.height / pixelSize),
                        kernel: 'nearest'
                    }).resize({
                        width: metadata.width,
                        height: metadata.height,
                        kernel: 'nearest'
                    });
                    break;

                case 'glow':
                    // Simple glow: blur + brighten + slight saturation
                    image = image.blur(10).modulate({ brightness: 1.3, saturation: 1.5 });
                    break;

                case 'red':
                    // Red tint
                    image = image.modulate({ brightness: 1, saturation: 1.5, hue: 0 });
                    image = image.tint({ r: 255, g: 100, b: 100 });
                    break;

                case 'gray':
                case 'grey':
                    image = image.grayscale();
                    break;

                case 'invert':
                    image = image.negate();
                    break;

                default:
                    return reply('Unknown edit command. Use: .upscale | .blur | .pixel <num> | .glow | .red | .gray | .invert');
            }

            outputBuffer = await image.png().toBuffer();

            // Send edited image
            await sock.sendMessage(m.key.remoteJid, {
                image: outputBuffer,
                mimetype: 'image/png',
                caption: `✨ Edited with .${cmd}`
            }, { quoted: m });

        } catch (err) {
            console.error('[MEDIA-EDITOR ERROR]', err.message || err);
            await reply('𓄄 Failed to edit image\n' + (err.message || 'Unknown error'));
        }
    }
};
