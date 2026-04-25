const axios = require('axios');

module.exports = {
    name: 'ttdl',
    alias: ['tik'],
    desc: 'Download TikTok videos without watermark',
    category: 'Downloader',
    usage: '.ttdl <TikTok URL>',
    reactions: { start: '🎵', success: '✅', error: '❔' },

    execute: async (sock, m, { args, reply, prefix, quoted }) => {
        let url = args[0]?.trim();

        // Check if replying to a message with TikTok URL
        if (!url || (!url.includes('tiktok.com') && !url.includes('vm.tiktok'))) {
            const target = m.quoted || quoted;
            if (target && target.text) {
                const urlMatch = target.text.match(/(https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+)/);
                if (urlMatch) url = urlMatch[0];
            }
        }

        if (!url) {
            return reply(
                `╭─❍ *TIKTOK DOWNLOADER*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}ttdl <TikTok URL>\n│\n` +
                `│ ✪ *Example:*\n` +
                `│ ${prefix}ttdl https://vt.tiktok.com/ZS96rB5qN/\n│\n` +
                `│ 📱 *Or reply to a TikTok link*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });

        // Progress message
        const progressMsg = await sock.sendMessage(m.chat, {
            text: `🎵 *Fetching TikTok...*\n\n▰▱▱▱▱▱▱▱▱▱ 0%\n\n🔍 Resolving URL...`
        });

        const updateProgress = async (percent, phase) => {
            const filled = Math.round(percent / 10);
            const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
            await sock.sendMessage(m.chat, {
                text: `🎵 *Fetching TikTok...*\n\n${bar} ${percent}%\n\n🔍 ${phase}`,
                edit: progressMsg.key
            });
        };

        try {
            await updateProgress(20, 'Resolving TikTok URL...');

            // Use TikWM API
            const apiUrl = `https://www.tikwm.com/api/`;
            const response = await axios.post(apiUrl, 
                { url: url, hd: 1 },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 30000
                }
            );

            const data = response.data;

            if (data.code !== 0 || !data.data) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                await sock.sendMessage(m.chat, { text: '❌ Failed to fetch TikTok video', edit: progressMsg.key });
                return;
            }

            const videoData = data.data;
            const videoUrl = videoData.hdplay || videoData.play || videoData.wmplay;
            const title = videoData.title || 'TikTok Video';
            const author = videoData.author?.nickname || 'Unknown';
            const duration = videoData.duration || 'N/A';
            const playCount = videoData.play_count?.toLocaleString() || 'N/A';

            if (!videoUrl) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                await sock.sendMessage(m.chat, { text: '❌ No video URL found', edit: progressMsg.key });
                return;
            }

            await updateProgress(50, 'Downloading video...');

            // Download the video
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            await updateProgress(90, 'Processing...');

            const buffer = Buffer.from(videoResponse.data);

            await updateProgress(100, 'Done!');
            await new Promise(r => setTimeout(r, 400));
            await sock.sendMessage(m.chat, { delete: progressMsg.key });

            // Send the video
            await sock.sendMessage(m.chat, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: `🎵 *${title}*\n\n👤 ${author}\n⏱️ ${duration}s | 👁️ ${playCount}\n\n_⚡ Downloaded via CRYSNOVA_`
            }, { quoted: m });

            // Also send music if available
            if (videoData.music) {
                await sock.sendMessage(m.chat, {
                    audio: { url: videoData.music },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    caption: `🎵 Music from: ${title}`
                });
            }

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (err) {
            console.error('[TTDL ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

            let errorMsg = '❌ *Failed*\n\n';
            if (err.code === 'ECONNABORTED') errorMsg += '⏰ Timeout\n';
            else errorMsg += `⚠️ ${err.message}`;

            await sock.sendMessage(m.chat, { text: errorMsg, edit: progressMsg.key });
        }
    }
};
