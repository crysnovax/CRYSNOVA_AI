const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

module.exports = {
    name: 'update',
    category: 'Owner',
    owner: true,
     // ⭐ Reaction config
    reactions: {
        start: '♻️',
        success: '📦'
    },
    

    execute: async (sock, m, { reply }) => {

        try {

            /*
            ──────────────────────────────
            AUTO CREATE UPDATE STRUCTURE
            ──────────────────────────────
            */

            const updateDir = path.join(__dirname, '../../../updates');
            const versionFile = path.join(updateDir, 'version.json');

            if (!fs.existsSync(updateDir)) {
                fs.mkdirSync(updateDir, { recursive: true });
            }

            if (!fs.existsSync(versionFile)) {

                fs.writeFileSync(
                    versionFile,
                    JSON.stringify({
                        version: "1.0.0",
                        changelog: "CRYSNOVA AI Initial Setup"
                    }, null, 2)
                );
            }

            /*
            ──────────────────────────────
            VERSION CHECK
            ──────────────────────────────
            */

            const repoVersionURL =
                "https://raw.githubusercontent.com/crysnovax/CRYSNOVA_AI/main/updates/version.json";

            const zipURL =
                "https://github.com/crysnovax/CRYSNOVA_AI/archive/refs/heads/main.zip";

            const packageJson = require('../../../package.json');

            const currentVersion = packageJson.version;

            reply("🔍 _Checking *CRYSNOVA AI* update..._");

            const res = await fetch(repoVersionURL);
            const data = await res.json();

            if (!data.version) {
                return reply("⚉ *Update metadata missing*.");
            }

            if (data.version === currentVersion) {
                return reply("✓ _*CRYSNOVA AI is already latest version*_.");
            }

            reply(`⬆ Update Found\nVersion: ${data.version}\nUpdating bot...`);

            /*
            ──────────────────────────────
            DOWNLOAD UPDATE ZIP
            ──────────────────────────────
            */

            const zipRes = await fetch(zipURL);
            const buffer = await zipRes.buffer();

            const zipPath = path.join(__dirname, "update.zip");

            fs.writeFileSync(zipPath, buffer);

            reply("✪ `Installing update...`");

            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries();

            const protectedPaths = [
                "config.js",
                "sessions/",
                "database/",
                ".env",
                "node_modules/"
            ];

            entries.forEach(entry => {

                const filename = entry.entryName;

                if (protectedPaths.some(p => filename.startsWith(p))) {
                    return;
                }

                if (!entry.isDirectory) {

                    const fullPath = path.join("./", filename);

                    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

                    fs.writeFileSync(fullPath, entry.getData());
                }
            });

            fs.unlinkSync(zipPath);

            reply("✓ *Update installed!*\n♻️ _*Restart panel now*_.");

        } catch (err) {
            console.error(err);
            reply("Update failed.");
        }
    }
};
