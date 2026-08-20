// unsaveall.js — deletes the .vcf contact exports created by .saveall so the
// temp folder stays clean. Companion to .saveall. @crysnovax—FIX12-08-26
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'unsaveall',
    alias: ['unsavecontacts', 'delvcfall', 'unsave'],
    desc: 'Delete all saved .vcf contact exports created by .saveall',
    category: 'Group',
    groupOnly: true,
    usage: '.unsaveall',
    reactions: { start: '🗑️', success: '✨' },

    execute: async (sock, m, { reply }) => {
        try {
            if (!m.isGroup) return reply('`⟁⃝GROUP ONLY!℘`');

            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) return reply('_✘ No saved contact files to delete_');

            let removed = 0;
            for (const file of fs.readdirSync(tempDir)) {
                if (!/\.vcf$/i.test(file)) continue;
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                    removed++;
                } catch {}
            }

            if (!removed) return reply('_✘ No saved contact files to delete_');

            return reply(
                `╭─❍ *UNSAVE ALL* 𓉤\n` +
                `│\n` +
                `│ 🗑️ Deleted ${removed} saved contact\n` +
                `│    file(s) from the temp folder.\n` +
                `│\n` +
                `│ _Use .saveall to export them again._\n` +
                `╰──────────────────`
            );
        } catch (err) {
            console.error('[UNSAVEALL ERROR]', err.message);
            reply(`_✘ Failed to delete saved contacts: ${err?.message || err}_`);
        }
    }
};
