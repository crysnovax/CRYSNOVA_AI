const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = {
  command: 'gitinstall',
  alias: ['gitupdate', 'installrepo'],
  description: 'Premium Git installer: clone, update, and install repo safely',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    const botFolder = path.resolve(__dirname, '..'); // bot root
    const repoURL = 'https://github.com/crysnovax/CRYSNOVA-AI.git'; // replace with your repo

    const runCommand = (cmd, cwd = botFolder) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout);
        });
      });

    try {
      await reply('⚡ Starting Git Installer...');

      // Step 1: Initialize Git if needed
      if (!fs.existsSync(path.join(botFolder, '.git'))) {
        await reply('ℹ Initializing Git repository...');
        await runCommand('git init');
        await reply('✅ Git initialized.');
      } else {
        await reply('ℹ Git repository already exists.');
      }

      // Step 2: Add remote if not exists
      const remotes = await runCommand('git remote -v');
      if (!remotes.includes('origin')) {
        await reply(`ℹ Adding remote origin ${repoURL}...`);
        await runCommand(`git remote add origin ${repoURL}`);
        await reply('✅ Remote added.');
      } else {
        await reply('ℹ Remote origin already set.');
      }

      // Step 3: Fetch latest
      await reply('ℹ Fetching latest commits...');
      await runCommand('git fetch');
      await reply('✅ Fetch completed.');

      // Step 4: Reset to origin/main
      await reply('ℹ Resetting bot to origin/main...');
      await runCommand('git reset --hard origin/main');
      await reply('✅ Bot updated to latest commit!');

      // Step 5: Install dependencies
      await reply('ℹ Installing npm dependencies...');
      await runCommand('npm install');
      await reply('✅ Dependencies installed.');

      // Step 6: Optional: clear require cache for plugins
      Object.keys(require.cache).forEach(key => {
        if (key.includes('plugins')) delete require.cache[key];
      });

      return reply('🎉 Git installation complete! Restart your bot to apply updates.');

    } catch (err) {
      return reply(`❌ Git Installer failed:\n${err}`);
    }
  }
};
