const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATABASE_DIR = path.join(__dirname, '..', 'database');
const STATUS_FILE = path.join(DATABASE_DIR, 'npmpush.json');

module.exports = {
  command: 'npmpush',
  description: 'Automatically push newly installed npm packages to GitHub',
  category: 'owner',
  owner: true,

  execute: async (sock, m, { reply }) => {
    try {
      // Ensure database folder exists
      if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true });

      // Ensure status file exists before reading
      if (!fs.existsSync(STATUS_FILE)) fs.writeFileSync(STATUS_FILE, JSON.stringify({ auto: false }, null, 2));

      const text = m.message?.conversation || m.msg?.text;
      const args = text ? text.split(' ') : [];

      // Toggle status
      if (args[1] === 'status') {
        if (!args[2] || !['on','off'].includes(args[2].toLowerCase())) 
          return reply('𓄄⚉ Usage: .npmpush status on|off');

        const status = args[2].toLowerCase() === 'on';
        fs.writeFileSync(STATUS_FILE, JSON.stringify({ auto: status }, null, 2));
        return reply(`✓ Auto NPM push is now ${status ? 'ON' : 'OFF'}`);
      }

      // Manual push fallback
      await manualPush(reply);

    } catch (err) {
      await reply(`⚉ npmpush error:\n${err}`);
    }
  }
};

// Watcher (called from main bot loader)
module.exports.watchPackages = function(sock) {
  // Ensure database and status file exist
  if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true });
  if (!fs.existsSync(STATUS_FILE)) fs.writeFileSync(STATUS_FILE, JSON.stringify({ auto: false }, null, 2));

  const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  if (!statusData.auto) return;

  const nodeModules = path.join(__dirname, '..', 'node_modules');

  // Watch node_modules for new packages
  fs.watch(nodeModules, { recursive: true }, async (eventType, filename) => {
    if (!filename) return;
    if (!fs.existsSync(path.join(nodeModules, filename))) return;

    try {
      await execPromise(`git add node_modules/${filename}`);
      await execPromise(`git commit -m "Add/Update npm package: ${filename}"`);
      await execPromise(`git push origin main`);

      // Disappearing reaction in chat
      if (sock.defaultJid) {
        const msg = await sock.sendMessage(sock.defaultJid, { react: { text: '✅', key: { remoteJid: sock.defaultJid, fromMe: true, id: 'npmpush' } } });
        setTimeout(async () => { await sock.sendMessage(sock.defaultJid, { delete: msg.key }) }, 3000);
      }
    } catch (err) {
      console.error('Auto npmpush error:', err);
    }
  });
};

// Manual push fallback
async function manualPush(reply) {
  const nodeModules = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModules)) return reply('✘ node_modules not found.𓉤');

  const packages = fs.readdirSync(nodeModules).filter(f => !f.startsWith('.'));
  for (const pkg of packages) {
    try {
      await execPromise(`git add node_modules/${pkg}`);
      await execPromise(`git commit -m "Add/Update npm package: ${pkg}"`);
      await execPromise(`git push origin main`);
    } catch (err) {
      console.error(`Failed pushing package ${pkg}:`, err);
    }
  }
  await reply(`✓ All npm packages pushed successfully!`);
}

// Promisify exec
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
                                                      }
