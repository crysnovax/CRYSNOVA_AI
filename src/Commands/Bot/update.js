const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

const CONFIG = {
    repo: 'crysnovax/CRYSNOVA_AI',
    branch: 'main',
    backupDir: './.update_backup',
    tempDir: './.update_temp',
    requestTimeout: 30000
};

const PROTECTED_PATHS = [
    'sessions',
    'database',
    'node_modules',
    '.env',
    'auth_info_baileys',
    'creds.json'
];

const safeFs = {
    mkdir: dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); },
    remove: p => { if (!fs.existsSync(p)) return; const stat = fs.statSync(p); stat.isDirectory() ? fs.rmSync(p, { recursive: true, force: true }) : fs.unlinkSync(p); },
    copy: (src, dest) => {
        if (!fs.existsSync(src)) return;
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            for (const item of fs.readdirSync(src)) {
                const srcPath = path.join(src, item);
                const destPath = path.join(dest, item);
                if (PROTECTED_PATHS.some(p => srcPath.includes(p))) continue;
                safeFs.copy(srcPath, destPath);
            }
        } else {
            fs.copyFileSync(src, dest);
        }
    }
};

function cleanupUntracked(folder, repoFilesSet) {
    for (const item of fs.readdirSync(folder)) {
        const fullPath = path.join(folder, item);
        const relative = path.relative('.', fullPath).replace(/\\/g, '/');
        if (PROTECTED_PATHS.some(p => relative.startsWith(p))) continue;
        if (!repoFilesSet.has(relative)) {
            safeFs.remove(fullPath);
        } else if (fs.statSync(fullPath).isDirectory()) {
            cleanupUntracked(fullPath, repoFilesSet);
        }
    }
}

function progressBar(percent) {
    const total = 10;
    const filled = Math.round((percent / 100) * total);
    return '▰'.repeat(filled) + '▱'.repeat(total - filled) + ` ${percent}%`;
}

async function update(sock, m, { reply }) {
    try {
        // Initial message
        let statusMsg = await reply(`𓉤 CRYSNOVA AI UPDATE SYSTEM\n\n_*✪ Initializing...*_`);

        // Backup
        safeFs.remove(CONFIG.backupDir);
        safeFs.mkdir(CONFIG.backupDir);
        for (const file of PROTECTED_PATHS) {
            if (fs.existsSync(file)) safeFs.copy(file, path.join(CONFIG.backupDir, file));
        }
        await sock.sendMessage(m.chat, { text: '`✓ Backup completed.`' }, { quoted: statusMsg });

        // Download
        const zipUrl = `https://github.com/${CONFIG.repo}/archive/refs/heads/${CONFIG.branch}.zip`;
        const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: CONFIG.requestTimeout });

        safeFs.remove(CONFIG.tempDir);
        safeFs.mkdir(CONFIG.tempDir);
        const zipPath = path.join(CONFIG.tempDir, 'update.zip');
        fs.writeFileSync(zipPath, zipRes.data);
        await sock.sendMessage(m.chat, { text: `_*⎙ Downloading update...*_\n${progressBar(25)}` }, { quoted: statusMsg });

        // Extract
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(CONFIG.tempDir, true);
        await sock.sendMessage(m.chat, { text: `_*📂 Extracting files...*_\n${progressBar(50)}` }, { quoted: statusMsg });

        // Copy to project
        const extractedFolder = path.join(CONFIG.tempDir, `${CONFIG.repo.split('/')[1]}-${CONFIG.branch}`);
        safeFs.copy(extractedFolder, './');
        await sock.sendMessage(m.chat, { text: `_*✪ Copying files...*_\n${progressBar(75)}` }, { quoted: statusMsg });

        // Cleanup old/untracked
        const repoFiles = new Set();
        function scanRepo(dir, base = '') {
            for (const f of fs.readdirSync(dir)) {
                const fullPath = path.join(dir, f);
                const relPath = path.join(base, f).replace(/\\/g, '/');
                repoFiles.add(relPath);
                if (fs.statSync(fullPath).isDirectory()) scanRepo(fullPath, relPath);
            }
        }
        scanRepo(extractedFolder);
        cleanupUntracked('.', repoFiles);

        // Cleanup temp
        safeFs.remove(CONFIG.tempDir);
        await sock.sendMessage(m.chat, { text: `_*✦ Update complete!*_\n${progressBar(100)}` }, { quoted: statusMsg });

    } catch (err) {
        console.error('[UPDATE ERROR]', err);
        await reply(`
𓉤 CRYSNOVA AI UPDATE SYSTEM

_*✘ Update Failed*_
`);
        // Restore backup
        for (const file of PROTECTED_PATHS) {
            const backupPath = path.join(CONFIG.backupDir, file);
            if (fs.existsSync(backupPath)) safeFs.copy(backupPath, file);
        }
        await reply(`Backup restored.`);
    }
}

module.exports = {
    name: 'update',
    alias: ['upgrade', 'upd'],
    category: 'owner',
    owner: true,
    desc: 'Safe auto-updater with progress bar',
    execute: update
};
