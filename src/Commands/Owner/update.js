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
        start: '🔎',
        success: '♻️'
    },
  

    execute: async (sock, m, { reply }) => {

        try {

            const repoVersionURL =
                "https://raw.githubusercontent.com/crysnovax/CRYSNOVA_AI/main/updates/version.json";

            const zipURL =
                "https://github.com/crysnovax/CRYSNOVA_AI/archive/refs/heads/main.zip";

            const packageJson = require('../../../package.json');
            const currentVersion = packageJson.version;

            reply("🔍 Checking for update...");

            const res = await fetch(repoVersionURL);
            const data = await res.json();

            if (!data.version) {
                return reply("Update metadata missing.");
            }

            if (data.version === currentVersion) {
                return reply("✓ _*CRYSNOVA AI is already latest version*_.");
            }

            reply(`⬆ Update Found\n\nCurrent: ${currentVersion}\nLatest: ${data.version}\n\nDownloading update...`);

            // Download ZIP update
            const zipRes = await fetch(zipURL);
            const buffer = await zipRes.buffer();

            const zipPath = path.join(__dirname, "update.zip");
            fs.writeFileSync(zipPath, buffer);

            reply("📦 _*Extracting update...*_");

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

            reply("✪ *Update installed successfully*!\n♻️ _*Restart bot panel now*_.");

        } catch (err) {
            console.error(err);
            reply("Update failed.");
        }
    }
};
