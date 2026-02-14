const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'update',
  description: 'Premium update: bootstrap git, restore packages & restart bot',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    const botFolder = path.resolve(__dirname, '..');
    const repo = 'https://github.com/crysnovax/CRYSNOVA-AI.git';

    const run = (cmd) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout.trim());
        });
      });

    try {
      await reply('⚡ Starting premium update...');

      // Step 0: Git bootstrap if missing
      if (!fs.existsSync(path.join(botFolder, '.git'))) {
        await reply('🛠 Git not initialized. Bootstrapping repository...');
        await run('git init');
        await run(`git remote add origin ${repo}`);
        await run('git fetch origin');
        await run('git checkout -b main origin/main || git checkout -b master origin/master');
        await reply('✅ Git repository initialized successfully!');
      }

      // Step 1: Set Git identity
      await run('git config user.name "crysnovax"');
      await run('git config user.email "carayasata1la@gmail.com"');

      // Step 2: Detect remote default branch dynamically
      let branch = await run('git symbolic-ref refs/remotes/origin/HEAD | sed "s@refs/remotes/origin/@@g"').catch(() => 'main');
      branch = branch.trim() || 'main';
      await reply(`🌿 Detected branch: ${branch}`);

      // Step 3: Fetch & reset
      await reply('📥 Fetching latest commits...');
      await run(`git fetch origin ${branch}`);
      await run(`git reset --hard origin/${branch}`);
      await reply('✅ Bot updated to latest commit!');

      // Step 4: Restore packages
      await reply('📦 Restoring npm packages...');
      await run('npm install');
      await reply('🎉 Packages restored successfully!');

      // Step 5: Auto-restart
      await reply('🔄 Restarting bot...');
      await run('pm2 restart all || node index.js');
      
    } catch (err) {
      await reply('❌ Update failed:\n' + err);
    }
  }
};
