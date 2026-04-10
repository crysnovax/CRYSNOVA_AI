const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

const CONFIG = {
    repo: 'crysnovax/CRYSNOVA_AI',
    branch: 'main',
    tempDir: './.format_temp',
    backupDir: './.format_backup',
    requestTimeout: 60000
};

// Only these two items are preserved
const PRESERVE = ['sessions', '.env'];

// Safe file operations
const safeFs = {
    mkdir: dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); },
    remove: p => {
        if (!fs.existsSync(p)) return;
        const stat = fs.statSync(p);
        stat.isDirectory() ? fs.rmSync(p, { recursive: true, force: true }) : fs.unlinkSync(p);
    },
    copy: (src, dest) => {
        if (!fs.existsSync(src)) return;
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
            safeFs.mkdir(dest);
            for (const item of fs.readdirSync(src)) {
                safeFs.copy(path.join(src, item), path.join(dest, item));
            }
        } else {
            fs.copyFileSync(src, dest);
        }
    }
};

// Delete everything except preserved items
function wipeDirectory(dir, preserveList) {
    for (const item of fs.readdirSync(dir)) {
        if (preserveList.includes(item)) continue;
        const fullPath = path.join(dir, item);
        safeFs.remove(fullPath);
    }
}

module.exports = {
    name: 'format',
    alias: ['flash', 'cleaninstall', 'factoryreset'],
    desc: 'Wipe bot and reinstall from GitHub (keeps only sessions & .env)',
    category: 'Owner',
    owner: true,
    usage: '.format confirm',

    execute: async (sock, m, { args, reply }) => {
        const confirmWord = args[0]?.toLowerCase();

        if (confirmWord !== 'confirm') {
            return reply(
                `⟁⃝⚠︎ *DESTRUCTIVE OPERATION*\n\n` +
                `This will DELETE EVERYTHING except:\n` +
                `• \`sessions/\` folder (auth)\n` +
                `• \`.env\` file\n\n` +
                `After wipe, a fresh copy will be installed from:\n` +
                `https://github.com/${CONFIG.repo}\n\n` +
                `To proceed, type: *.format confirm*`
            );
        }

        await reply(`𖣘 *FORMAT INITIATED*\n\n_Preserving sessions/ and .env..._`);

        try {
            // 1. Backup preserved items
            safeFs.remove(CONFIG.backupDir);
            safeFs.mkdir(CONFIG.backupDir);
            for (const item of PRESERVE) {
                if (fs.existsSync(item)) {
                    safeFs.copy(item, path.join(CONFIG.backupDir, item));
                }
            }
            await reply('`✓ Backup created.`');

            // 2. Wipe current directory (except preserved)
            wipeDirectory('.', PRESERVE);
            await reply('`✓ Bot directory wiped.`');

            // 3. Download latest repository
            const zipUrl = `https://github.com/${CONFIG.repo}/archive/refs/heads/${CONFIG.branch}.zip`;
            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: CONFIG.requestTimeout });

            safeFs.remove(CONFIG.tempDir);
            safeFs.mkdir(CONFIG.tempDir);
            const zipPath = path.join(CONFIG.tempDir, 'update.zip');
            fs.writeFileSync(zipPath, zipRes.data);
            await reply('`✓ Repository downloaded.`');

            // 4. Extract
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(CONFIG.tempDir, true);
            await reply('`✓ Files extracted.`');

            // 5. Copy new files to project root
            const extractedFolder = path.join(CONFIG.tempDir, `${CONFIG.repo.split('/')[1]}-${CONFIG.branch}`);
            safeFs.copy(extractedFolder, './');
            await reply('`✓ Fresh installation copied.`');

            // 6. Restore preserved items
            for (const item of PRESERVE) {
                const backupPath = path.join(CONFIG.backupDir, item);
                if (fs.existsSync(backupPath)) {
                    safeFs.remove(item);
                    safeFs.copy(backupPath, item);
                }
            }
            await reply('`✓ Sessions and .env restored.`');

            // 7. Cleanup temp folders
            safeFs.remove(CONFIG.tempDir);
            safeFs.remove(CONFIG.backupDir);

            await reply(
                `ಠ_ಠ *FORMAT COMPLETE*\n\n` +
                `Bot has been reset to factory state.\n` +
                `Sessions and .env preserved.\n\n` +
                `_Restarting in 3 seconds..._`
            );

            // Graceful restart
            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (err) {
            console.error('[FORMAT ERROR]', err);

            // Attempt restore on failure
            try {
                for (const item of PRESERVE) {
                    const backupPath = path.join(CONFIG.backupDir, item);
                    if (fs.existsSync(backupPath)) {
                        safeFs.remove(item);
                        safeFs.copy(backupPath, item);
                    }
                }
            } catch (e) {}

            reply(`✘ *FORMAT FAILED*\n${err.message}\n\nBackup restored.`);
        }
    }
};
