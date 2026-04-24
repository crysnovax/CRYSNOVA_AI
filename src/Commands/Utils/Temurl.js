const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: 'nurl',
    alias: ['tourl', 'upload'],
    desc: 'Upload image and get a copyable URL',
    category: 'Tools',
    reactions: { start: '📤', success: '🔖', error: '❔' },

    execute: async (sock, m, { reply }) => {
        if (!m.quoted) return reply('`𓉤 Reply to an image`');

        const mtype = m.quoted.mtype || '';
        if (!mtype.includes('image')) return reply('`⚉ Reply to an image`');

        await sock.sendMessage(m.chat, { react: { text: '📤', key: m.key } });

        try {
            const buffer = await m.quoted.download();
            if (!buffer) return reply('`✘ Download failed`');

            // ✅ Use uguu.se (your friend's working uploader)
            let url = null;
            
            // Try uguu.se first
            try {
                const form = new FormData();
                form.append('files[]', buffer, { filename: `${Date.now()}.jpg` });

                const res = await axios.post('https://uguu.se/upload.php', form, {
                    headers: {
                        ...form.getHeaders(),
                        'Origin': 'https://uguu.se',
                        'Referer': 'https://uguu.se/',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                    },
                    timeout: 30000
                });

                url = res.data?.files?.[0]?.url;
            } catch (e) {
                console.log('[NURL] uguu failed, trying quax...');
            }

            // Try qu.ax as fallback
            if (!url) {
                try {
                    const form = new FormData();
                    form.append('files[]', buffer, { filename: `${Date.now()}.jpg` });

                    const res = await axios.post('https://qu.ax/upload.php', form, {
                        headers: {
                            ...form.getHeaders(),
                            'Origin': 'https://qu.ax',
                            'Referer': 'https://qu.ax/',
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                        },
                        timeout: 30000
                    });

                    url = res.data?.files?.[0]?.url;
                } catch (e) {
                    console.log('[NURL] quax failed too...');
                }
            }

            // Try catbox as last resort
            if (!url) {
                try {
                    const form = new FormData();
                    form.append('reqtype', 'fileupload');
                    form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

                    const res = await axios.post('https://catbox.moe/user/api.php', form, {
                        headers: {
                            ...form.getHeaders(),
                            'Origin': 'https://catbox.moe',
                            'Referer': 'https://catbox.moe/',
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                        },
                        timeout: 30000
                    });

                    url = res.data?.trim();
                    if (url && !url.startsWith('http')) url = null;
                } catch (e) {
                    console.log('[NURL] catbox failed too...');
                }
            }

            if (!url) return reply('`✘ All upload services failed`');

            await sock.sendMessage(m.chat, {
                text: `⎙ *Uploaded!*\n\n▽ ❏ _Tap button below to copy URL_`,
                nativeFlow: [{
                    text: '📋 Copy URL',
                    copy: url
                }]
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[NURL ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.message || 'Upload failed'}\``);
        }
    }
};
