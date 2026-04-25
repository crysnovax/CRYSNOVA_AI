const axios = require('axios');

module.exports = {
    name: 'ytstream',
    alias: ['streamyt', 'yts'],
    desc: 'Download YouTube video streaing not buffer perfect for large videos',
    category: 'downloader',
    usage: '.yt <YouTube URL>',

    execute: async (sock, m, { args, reply }) => {
        const url = args[0]?.trim();

        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return reply(
                '𓄄 *Provide a valid YouTube URL!*\n\n' +
                'Example:\n' +
                '`.yt https://youtu.be/xxxx`'
            );
        }

        await reply('✪ _*Downloading YouTube video...*_');

        try {
            const api = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(url)}`;
            const res = await axios.get(api, { headers: { Accept: "application/json" } });

            const data = res.data;

            console.log('[YT] API raw response:', JSON.stringify(data, null, 2));

            const video =
                data?.videos?.["720"] ||
                data?.videos?.["480"] ||
                data?.videos?.["360"] ||
                Object.values(data?.videos || {})[0];

            if (!video) {
                return reply("✘ Failed to fetch video");
            }

            const title = data.title || "YouTube Video";
            const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);

            const caption =
                `🎬 *YouTube Downloader*\n\n` +
                `Title: ${title}\n` +
                `✓ Download Complete`;

            // ✅ Send as document first (better for large files)
            try {
                await sock.sendMessage(m.chat, {
                    document: { url: video },
                    mimetype: "video/mp4",
                    fileName: `${safeTitle}.mp4`,
                    caption
                }, { quoted: m });

                console.log('[YT] Sent as document successfully');

            } catch (docErr) {
                console.error('[YT] Document send failed:', docErr.message);

                // Fallback: try sending as video
                try {
                    await sock.sendMessage(m.chat, {
                        video: { url: video },
                        mimetype: "video/mp4",
                        caption,
                        fileName: `${safeTitle}.mp4`
                    }, { quoted: m });

                    console.log('[YT] Sent as video successfully');

                } catch (videoErr) {
                    console.error('[YT] Video send failed:', videoErr.message);

                    // Last resort: send as text link
                    await reply(
                        `🎬 *YouTube Downloader*\n\n` +
                        `Title: ${title}\n\n` +
                        `🔗 *Download Link:*\n${video}\n\n` +
                        `_Could not send video directly. Click the link to download._`
                    );
                }
            }

        } catch (err) {
            console.error('[YT ERROR]', err.message);
            console.error('[YT ERROR FULL]', err);

            if (err.code === 'ENOSPC' || err.message.includes('No space left on device')) {
                reply('`✘ Server storage full. Run .cleanup to free space.`');
            } else if (err.message.includes('timeout') || err.code === 'ECONNABORTED') {
                reply('`✘ Request timed out. Video may be too large.`');
            } else if (err.response?.status === 404) {
                reply('`✘ Video not found. Link may be broken or private.`');
            } else {
                reply(`\`✘ ${err.message}\``);
            }
        }
    }
};
