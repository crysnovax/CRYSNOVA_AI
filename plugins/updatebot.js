const { exec } = require('child_process');
const path = require('path');

// === CONFIG: put your GitHub token and repo here ===
const GITHUB_TOKEN = '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';
const REPO = 'crysnovax/CRYSNOVA-AI'; // format: username/repo

module.exports = {
  command: 'update',
  description: 'Pull the latest updates from GitHub (token-auth)',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply, args }) => {
    const botFolder = path.resolve(__dirname, '..');

    const run = (cmd) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout.trim());
        });
      });

    try {
      await reply('⚡ Checking for updates...');

      // Ensure Git repo exists
      await run('git init').catch(() => {});
      await run(`git remote remove origin`).catch(() => {});
      await run(`git remote add origin https://${GITHUB_TOKEN}@github.com/${REPO}.git`);

      // Fetch and reset to remote main
      await run('git fetch origin');
      await run('git reset --hard origin/main');

      await reply('🎉 Update complete! Bot is now up-to-date with the repo.');
    } catch (err) {
      await reply(`❌ Update failed:\n${err}`);
    }
  }
};
