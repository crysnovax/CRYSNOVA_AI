const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const REPO_ROOT = path.join(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'database', 'npmpush.log');

module.exports = {
  command: 'npmpush',
  owner: true,
  execute: async (sock, m, { reply }) => {
    try {
      if (!fs.existsSync(path.join(REPO_ROOT, 'database'))) fs.mkdirSync(path.join(REPO_ROOT, 'database'));

      const log = (msg) => fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`);

      const pkgPath = path.join(REPO_ROOT, 'package.json');
      if (!fs.existsSync(pkgPath)) return reply('✘ package.json not found.');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      const nodeModules = path.join(REPO_ROOT, 'node_modules');
      if (!fs.existsSync(nodeModules)) return reply('𓉤 node_modules not found.');

      // Detect installed packages including scoped
      let installed = fs.readdirSync(nodeModules).filter(f => !f.startsWith('.'));
      const scopes = installed.filter(f => f.startsWith('@'));
      installed = installed.filter(f => !f.startsWith('@'));
      for (const scope of scopes) {
        const scopePath = path.join(nodeModules, scope);
        const scopedPackages = fs.readdirSync(scopePath).map(pkg => `${scope}/${pkg}`);
        installed.push(...scopedPackages);
      }

      const unlisted = installed.filter(pkgName => !(pkg.dependencies && pkg.dependencies[pkgName]));
      if (!unlisted.length) return reply('𓄄 Nothing new to push.');

      // Send initial progress message
      let progressMsg = await sock.sendMessage(m.key.remoteJid, { text: '📦 npmpush: Starting...\n[____________________] 0%' });

      const barLength = 20;
      let completed = 0;
      const skipped = [];

      // Animate bar per package
      for (const pkgName of unlisted) {
        try {
          await execPromise(`npm install ${pkgName} --save`, { cwd: REPO_ROOT });
          log(`✅ Installed ${pkgName}`);
        } catch (e) {
          skipped.push(pkgName);
          log(`⚠️ Skipped ${pkgName} (failed)`);
        }

        completed++;
        const perc = Math.floor((completed / unlisted.length) * 100);
        const filled = '#'.repeat(Math.floor((perc / 100) * barLength));
        const empty = '_'.repeat(barLength - filled.length);
        const bar = `[${filled}${empty}] ${perc}%`;

        // Edit progress message with "premium terminal style"
        await sock.sendMessage(m.key.remoteJid, { text: `📦 Installing packages ${bar}`, edit: progressMsg.key });
      }

      // Detect branch
      const branch = (await execPromise('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT })).trim();

      // Push logic
      const filesToPush = ['package.json', 'package-lock.json'];
      const allExist = filesToPush.every(f => fs.existsSync(path.join(REPO_ROOT, f)));

      if (allExist) {
        await execPromise(`git push origin ${branch}`, { cwd: REPO_ROOT });
        log('ℹ️ All files present, pushed directly to repo');
      } else {
        const changes = (await execPromise('git status --porcelain', { cwd: REPO_ROOT })).trim();
        if (changes) {
          await execPromise('git add package.json package-lock.json', { cwd: REPO_ROOT });
          await execPromise('git commit -m "Auto-add new npm packages"', { cwd: REPO_ROOT });
          await execPromise(`git push origin ${branch}`, { cwd: REPO_ROOT });
          log(`✅ Committed & pushed updated files to branch ${branch}`);
        } else {
          await execPromise(`git push origin ${branch}`, { cwd: REPO_ROOT });
          log('ℹ️ Nothing to commit, pushed anyway');
        }
      }

      // FINAL SUMMARY (separate message so you always see it)
      let summary = `📦 npmpush finished!\n\nInstalled packages: ${unlisted.length}`;
      if (skipped.length) summary += `\nSkipped packages (failed): ${skipped.join(', ')}`;
      summary += `\nBranch: ${branch}\nLog saved to npmpush.log`;

      await sock.sendMessage(m.key.remoteJid, { text: summary });

    } catch (err) {
      fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ❌ Error: ${err}\n`);
      reply(`⚉ npmpush error:\n${err}`);
    }
  }
};

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
}
