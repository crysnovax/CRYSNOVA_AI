const axios = require('axios');
const mime = require('mime-types');
const path = require('path');

module.exports = {
    name: 'd',
    alias: ['download', 'dl', 'getmedia', 'fetchmedia'],
    desc: 'Download & send media from direct URL',
    category: 'downloader',
    usage: '.d <direct URL>',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();
        if (!url || !url.startsWith('http')) {
            return reply(`📥 *Direct Downloader*\n\nSend a direct media link (image/video/audio/doc)\nExample: .d https://files.catbox.moe/vb1aja.mp4`);
        }

        try {
            await reply('✪ _*Downloading...*_');

            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const buffer = Buffer.from(response.data);
            if (buffer.length < 1000) return reply('✘ *File too small or empty*');

            let mimeType = response.headers['content-type'] || '';
            let ext = mime.extension(mimeType) || url.split('.').pop().toLowerCase() || 'bin';
            const fileName = `downloaded_${Date.now()}.${ext}`;

            // Determine send type
            let sendKey = 'document';
            if (['jpg','jpeg','png','gif','webp'].includes(ext)) sendKey = 'image';
            else if (['mp4','mov','avi','mkv','webm'].includes(ext)) sendKey = 'video';
            else if (['mp3','m4a','ogg','wav'].includes(ext)) sendKey = 'audio';

            await sock.sendMessage(m.key.remoteJid, {
                [sendKey]: buffer,
                mimetype: mimeType || 'application/octet-stream',
                fileName,
                caption: `Downloaded from: ${url.split('?')[0]}\nvia CRYSNOVA`
            }, { quoted: m });

        } catch (err) {
            console.error('[D ERROR]', err.message || err);
            let msg = '𓉤 _*Failed to download*_\n\n';
            if (err.response?.status === 404) msg += '• Link not found (404)\n';
            if (err.code === 'ECONNABORTED') msg += '• Timeout — file too large or slow\n';
            msg += '• Make sure URL is **direct** (ends with .mp4/.jpg etc.)\n• Not a YouTube/TikTok page link\n• Try a different URL';
            await reply(msg);
        }
    }
};
