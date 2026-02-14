const { exec } = require('child_process');
const path = require('path');

module.exports = {
  command: 'gitpush',
  description: 'Commit and push changes to GitHub automatically',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply, args }) => {
    const botFolder = path.resolve(__dirname, '..');
    const message = args.join(' ') || 'update from bot';

    const run = (cmd) =>
      new Promise((res, rej) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) return rej(stderr || err.message);
          res(stdout.trim());
        });
      });

    try {
      // Set Git identity locally
      await run('git config user.name "crysnovax"');
      await run('git config user.email "carayasata1la@gmail.com"');

      await reply('📦 Adding files...');
      await run('git add package.json package-lock.json');

      // Strictly check if there is anything to commit
      const status = await run('git diff --cached --name-only');
      if (!status) {
        await reply('⚠ Nothing to commit. Skipping commit step.');
      } else {6
        await reply('📝 Committing...');
        await run(`git commit -m "${message}"`);
        await reply('✅ Committed changes.');
      }

      // Detect current branch
      const branch = await run('git rev-parse --abbrev-ref HEAD');
      await reply(`🌿 Current branch: ${branch}`);

      await reply('🚀 Pushing to GitHub...');

      const token = 'ghp_xxxxxxxxxxxxxxccc';//add a valid token to use
      await run(`git push https://${token}@github.com/crysnovax/CRYSNOVA-AI.git ${branch}`);

      reply('🎉 Successfully pushed to GitHub!');
    } catch (err) {
      reply('❌ Git push failed:\n' + err);
    }
  }
};
