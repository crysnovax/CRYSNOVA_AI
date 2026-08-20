// nosound.js — remove the sound from ANY quoted mp4 (or any video) and send
// the silent version back. (@crysnovax—FIX14-08-26)
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const TEMP_DIR = path.join(__dirname, '../../../temp');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function cleanUp(...files) {
    for (const f of files) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
}

module.exports = {
    name: 'nosound',
    alias: ['mutevid', 'silent', 'noso'],
    desc: 'Remove the sound from a replied video and send it back silent',
    category: 'Media-Editor',
    usage: '.nosound (reply to a video)',
    reactions: { start: '🔇', success: '📹', error: '🙅' },

    execute: async (sock, m, { reply }) => {
        await sock.sendMessage(m.chat, { react: { text: '🔇', key: m.key } });

        if (!m.quoted || m.quoted.mtype !== 'videoMessage') {
            await sock.sendMessage(m.chat, { react: { text: '🙅', key: m.key } });
            return reply('`✘ Reply to a video to remove its sound!`\n_Example: reply to a video + .nosound_');
        }

        const ts = Date.now();
        const inPath = path.join(TEMP_DIR, `nosound_${ts}.mp4`);
        const outPath = path.join(TEMP_DIR, `nosound_${ts}_muted.mp4`);

        try {
            const buffer = await m.quoted.download();
            if (!buffer || !buffer.length) return reply('`✘ Failed to download the video`');
            fs.writeFileSync(inPath, buffer);

            await new Promise((resolve, reject) => {
                exec(
                    `"${ffmpegPath}" -y -i "${inPath}" -an -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p "${outPath}"`,
                    (err) => (err ? reject(err) : resolve())
                );
            });

            const muted = fs.readFileSync(outPath);
            await sock.sendMessage(
                m.chat,
                {
                    video: muted,
                    mimetype: 'video/mp4',
                    caption: m.quoted.caption || ''
                },
                { quoted: m }
            );

            cleanUp(inPath, outPath);
            await sock.sendMessage(m.chat, { react: { text: '📹', key: m.key } });
            return reply('`✓ Silent video sent` — sound removed 🔇');
        } catch (err) {
            console.error('[NOSOUND ERROR]', err.message);
            cleanUp(inPath, outPath);
            await sock.sendMessage(m.chat, { react: { text: '🙅', key: m.key } });
            return reply('`✘ Failed: ' + (err.message || 'unknown error') + '`');
        }
    }
};
