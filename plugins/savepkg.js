const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'savepkg',
  description: 'Save all installed npm packages and restore them after update',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    const botFolder = path.resolve(__dirname, '..');
    const packageJsonPath = path.join(botFolder, 'package.json');

    const run = (cmd) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout.trim());
        });
      });

    try {
      await reply('📦 Saving all installed packages...');

      // Step 1: Read current installed packages
      const npmListRaw = await run('npm list --depth=0 --json');
      const npmList = JSON.parse(npmListRaw);
      const dependencies = {};

      for (const [name, info] of Object.entries(npmList.dependencies || {})) {
        dependencies[name] = info.version;
      }

      // Step 2: Read or create package.json
      let pkg = { name: 'bot', version: '1.0.0', dependencies: {} };
      if (fs.existsSync(packageJsonPath)) {
        pkg = JSON.parse(fs.readFileSync(packageJsonPath));
      }
      pkg.dependencies = dependencies;

      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      await reply('✅ package.json updated with all installed packages.');

      // Step 3: Install all dependencies (restores after update)
      await reply('⚡ Installing all dependencies...');
      await run('npm install');
      await reply('🎉 All packages saved and restored successfully!');
    } catch (err) {
      await reply('❌ Failed to save/restore packages:\n' + err);
    }
  }
};
