const fs = require('fs');
const path = require('path');

const SAVE_DIR = path.join(__dirname, '../../../downloads/saved');

if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

module.exports = {
    name: 'save',
    alias: ['download', 'savemedia'],
    desc: 'Save quoted media locally',
    category: 'Tools',

    execute: async (sock, m, { reply }) => {
        try {
            if (!m.quoted) {
                return reply('⊘ Reply to an image, video, audio or sticker to save.');
            }

            const q = m.quoted;

            if (!q.download) {
                return reply('⊘ This message cannot be saved.');
            }

            const buffer = await q.download();

            if (!buffer) {
                return reply('⊘ Failed to download media.');
            }

            const type = q.mtype || 'file';
            const ext =
                type.includes('image') ? 'jpg' :
                type.includes('video') ? 'mp4' :
                type.includes('audio') ? 'mp3' :
                type.includes('sticker') ? 'webp' : 'bin';

            const fileName = `save_${Date.now()}.${ext}`;
            const filePath = path.join(SAVE_DIR, fileName);

            fs.writeFileSync(filePath, buffer);

            return reply(`✓ Media saved successfully\n\n⎙ File: ${fileName}`);
        } catch (e) {
            console.log(e);
            return reply('⊘ Failed to save media.');
        }
    }
};
