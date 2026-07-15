const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
// Pure-JS exif writer (node-webpmux) instead of wa-sticker-formatter -> sharp.
const { addExif } = require('../../../library/exif');

module.exports = {
    name: 'tgsticker',
    alias: ['tg', 'telegramsticker', 'tgs'],
    desc: 'Download 5 random Telegram stickers (images & videos) and convert to WhatsApp stickers',
    category: 'Tools',
    usage: '.tg <Telegram sticker URL>',
    examples: ['.tg https://t.me/addstickers/HoppersCartoon'],
    reactions: { start: '📦', success: '🍃', error: '🕸️' },

    execute: async (sock, m, { args, reply }) => {
        let link = args[0];
        const chatId = m.chat || m.from || m.key?.remoteJid;

        if (m.quoted && m.quoted.text) {
            const quotedText = m.quoted.text;
            const match = quotedText.match(/https?:\/\/t\.me\/addstickers\/[^\s]+/i);
            if (match) {
                link = match[0];
            }
        }

        const safeReply = async (text) => {
            try {
                if (reply && typeof reply === 'function') {
                    await reply(text);
                } else if (sock && sock.sendMessage && chatId) {
                    await sock.sendMessage(chatId, { text });
                }
            } catch (e) {}
        };

        if (!link || !link.includes('t.me/addstickers/')) {
            return safeReply(
                `📦 *TELEGRAM STICKER DOWNLOADER*\n\n` +
                `*Usage:* .tg <Telegram sticker URL>\n\n` +
                `*Example:* .tg https://t.me/addstickers/HoppersCartoon\n\n` +
                `Or reply to a message containing a Telegram sticker link.`
            );
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '📦', key: m.key } });
        } catch (e) {}

        const packName = link.split('t.me/addstickers/')[1].split(/[?#]/)[0];

        const botToken = '8989721606:AAH_WdnH6NVkCmEeOVrOQhBpiewoSp61HEc';

        try {
            const res = await fetch(
                `https://api.telegram.org/bot${botToken}/getStickerSet?name=${packName}`
            );
            const data = await res.json();

            if (!data.ok) {
                throw new Error(data.description || 'Invalid sticker pack');
            }

            const stickers = data.result.stickers;

            if (stickers.length === 0) {
                throw new Error('Sticker pack is empty');
            }

            const shuffled = stickers.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 5);
            let count = 0;

            for (const sticker of selected) {
                try {
                    const fileRes = await fetch(
                        `https://api.telegram.org/bot${botToken}/getFile?file_id=${sticker.file_id}`
                    );
                    const fileData = await fileRes.json();

                    if (!fileData.ok) continue;

                    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                    const imgRes = await fetch(fileUrl);
                    if (!imgRes.ok) continue;

                    let buffer = Buffer.from(await imgRes.arrayBuffer());
                    const isVideo = sticker.is_video || false;
                    let finalBuffer = buffer;

                    if (isVideo) {
                        try {
                            const tempDir = path.join(__dirname, '../../temp');
                            if (!fs.existsSync(tempDir)) {
                                fs.mkdirSync(tempDir, { recursive: true });
                            }

                            const timestamp = Date.now();
                            const input = path.join(tempDir, `tg_${timestamp}_${count}.webm`);
                            const output = path.join(tempDir, `tg_${timestamp}_${count}.webp`);

                            fs.writeFileSync(input, buffer);

                            const cmd = `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-ow)/2:(ih-oh)/2,format=yuva420p,fps=15" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -preset default -compression_level 6 "${output}"`;

                            await new Promise((resolve, reject) => {
                                exec(cmd, (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            });

                            finalBuffer = fs.readFileSync(output);

                            try {
                                fs.unlinkSync(input);
                                fs.unlinkSync(output);
                            } catch (e) {}

                        } catch (ffmpegErr) {
                            finalBuffer = buffer;
                        }
                    }

                    try {
                        finalBuffer = await addExif(finalBuffer, 'CRYSNOVA AI', 'crysnovax', ['🔥']);
                    } catch (stickerErr) {}

                    await sock.sendMessage(chatId, { sticker: finalBuffer });
                    count++;

                    await new Promise(r => setTimeout(r, 5000));

                } catch (err) {}
            }

            try {
                await sock.sendMessage(chatId, { react: { text: '🍃', key: m.key } });
            } catch (e) {}

            if (count === 0) {
                await safeReply('� Failed to process any stickers from this pack.');
            }

        } catch (err) {
            try {
                await sock.sendMessage(chatId, { react: { text: '🕸️', key: m.key } });
            } catch (e) {}

            await safeReply(`� *Error:* ${err.message}`);
        }
    }
};
