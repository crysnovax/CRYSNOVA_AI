const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'update',
  description: 'Premium update: pull latest via SSH, reinstall packages & restart bot',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    const botFolder = path.resolve(__dirname, '..'); // assuming commands folder is one level down from root
    const repoSSH = 'git@github.com:crysnovax/CRYSNOVA-AIt.git'; // your SSH URL (note: repo name CRYSNOVA-AIt from your clone command)

    // Helper to run shell commands in bot folder
    const run = (cmd) =>
      new Promise((resolve, reject) => {
        exec(cmd, { cwd: botFolder }, (err, stdout, stderr) => {
          if (err) {
            reject(stderr || err.message || 'Command failed');
          } else {
            resolve(stdout.trim());
          }
        });
      });

    try {
      await reply('⚡ Starting secure SSH update... (no token needed)');

      // Step 1: Ensure .git exists, init if missing
      if (!fs.existsSync(path.join(botFolder, '.git'))) {
        await reply('🛠 No .git folder found. Initializing repo via SSH...');
        await run('git init');
        await run(`git remote add origin ${repoSSH}`);
        await reply('✅ Repo initialized with SSH remote.');
      }

      // Optional: Verify remote is SSH (fix if someone set HTTPS before)
      const currentRemote = await run('git remote get-url origin').catch(() => '');
      if (currentRemote.includes('https://')) {
        await reply('🔧 Switching remote to SSH...');
        await run(`git remote set-url origin ${repoSSH}`);
      }

      // Step 2: Detect default branch dynamically (main or master)
      let branch = 'main';
      try {
        const headRef = await run('git symbolic-ref refs/remotes/origin/HEAD');
        branch = headRef.replace('refs/remotes/origin/', '').trim();
      } catch {
        // fallback
      }
      await reply(`🌿 Using branch: ${branch}`);

      // Step 3: Fetch & hard reset to latest (clean update)
      await reply('✪ Pulling latest changes via SSH...');
      await run(`git fetch origin ${branch}`);
      await run(`git reset --hard origin/${branch}`);
      await run('git clean -fd'); // optional: remove untracked files/folders
      await reply('✓ Code updated to latest commit!');

      // Step 4: Reinstall dependencies
      await reply('📦 Running npm install...');
      await run('npm install --no-audit --no-fund');
      await reply('🎉 Packages updated/restored!𓉤');

      // Step 5: Restart bot safely
      await reply('🔄 Restarting bot via PM2...');

      // Preferred: if running under PM2, restart current process name
      // (safer than 'all' if multiple bots)
      try {
        await run('pm2 restart CRYSNOVA-AIt || pm2 restart index || pm2 restart all');
      } catch (pm2Err) {
        // fallback if not PM2 or name wrong
        await reply('⚉ PM2 restart failed, trying plain restart...');
        process.exit(0); // let hosting panel or supervisor restart
      }

      // If PM2 works, this line may never run (good!)
      await reply('Update complete! Bot restarting now...');

    } catch (err) {
      await reply(`✘ Update failed:\n${err.message || err}`);
      console.error('[UPDATE ERROR]', err);
    }
  }
};
