const { exec } = require('child_process');
const path = require('path');

module.exports = {
  command: 'update',
  description: 'Update bot from GitHub safely with automatic package restore',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    const botFolder = path.resolve(__dirname, '..');
    const token = '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'; // your GitHub token
    const repo = 'https://github.com/crysnovax/CRYSNOVA-AI.git';

    const run = (cmd) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout.trim());
        });
      });

    try {
      await reply('⚡ Fetching latest updates from GitHub...');

      // Step 1: Set Git identity
      await run('git config user.name "crysnovax"');
      await run('git config user.email "carayasata1la@gmail.com"');

      // Step 2: Detect current branch dynamically
      const branch = await run('git rev-parse --abbrev-ref HEAD');
      if (!branch) throw new Error('Unable to detect current branch');

      // Step 3: Fetch and reset to remote
      await run(`git fetch ${repo} ${branch}`);
      await run(`git reset --hard origin/${branch}`);
      await reply(`🌿 Updated bot to latest commit on branch ${branch}`);

      // Step 4: Restore packages
      await reply('📦 Restoring npm packages...');
      await run('npm install');
      await reply('🎉 Packages restored successfully!');

      // Optional: restart prompt
      await reply('🔄 Update complete! You may now restart the bot.');
    } catch (err) {
      await reply('❌ Update failed:\n' + err);
    }
  }
};
