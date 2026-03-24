const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

const CONFIG = {
    repo: 'crysnovax/CRYSNOVA_AI',
    branch: 'main',
    requestTimeout: 30000
};

async function newUpdate(sock, m, { reply }) {
    try {
        const zipUrl = `https://github.com/${CONFIG.repo}/archive/refs/heads/${CONFIG.branch}.zip`;
        const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: CONFIG.requestTimeout });

        // Extract to temp folder
        const tempDir = './.update_check';
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true });

        const zipPath = path.join(tempDir, 'update.zip');
        fs.writeFileSync(zipPath, zipRes.data);

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);

        const extractedFolder = path.join(tempDir, `${CONFIG.repo.split('/')[1]}-${CONFIG.branch}`);

        // Compare files
        function getAllFiles(dir, base = '') {
            let files = [];
            for (const f of fs.readdirSync(dir)) {
                const fullPath = path.join(dir, f);
                const relPath = path.join(base, f).replace(/\\/g, '/');
                if (fs.statSync(fullPath).isDirectory()) {
                    files = files.concat(getAllFiles(fullPath, relPath));
                } else {
                    files.push(relPath);
                }
            }
            return files;
        }

        const repoFiles = getAllFiles(extractedFolder);
        const localFiles = getAllFiles('./');

        const newOrChanged = repoFiles.filter(f => {
            const localPath = path.join('.', f);
            if (!fs.existsSync(localPath)) return true; // new file
            const repoData = fs.readFileSync(path.join(extractedFolder, f));
            const localData = fs.readFileSync(localPath);
            return !repoData.equals(localData); // changed file
        });

        if (!newOrChanged.length) {
            await reply('`✓ Your panel is up to date with the repository.`');
        } else {
            const list = newOrChanged.map(f => `• ${f}`).join('\n');
            await reply(`_*📢 New or updated files available in repo:*_\n${list}`);
        }

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });

    } catch (err) {
        console.error(err);
        await reply('_*✘ Failed to check for updates.*_');
    }
}

module.exports = {
    name: 'checkup',
    alias: ['newupd'],
    category: 'owner',
    owner: true,
    desc: 'Check for new updates without applying',
    execute: newUpdate
};
