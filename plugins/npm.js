const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  command: 'npm',
  description: 'Manage npm packages (owner only)',
  category: 'system',

  execute: async (sock, m, { reply, isCreator, text }) => {
    if (!isCreator) {
      await sock.sendMessage(m.chat, { react: { text: '🔒', key: m.key } });
      return reply('Owner only command');
    }

    if (!text) {
      return reply(
        'Commands:\n' +
        '.npm install <pkg>       → install\n' +
        '.npm uninstall <pkg>     → remove\n' +
        '.npm list / .pkgs        → list installed\n' +
        '.npm update              → update all\n' +
        '.npm update <pkg>        → update specific\n' +
        '.npm audit               → security scan\n' +
        '.npm fund                → funding links'
      );
    }

    const args = text.trim().split(/\s+/);
    const subCmd = args[0].toLowerCase();

    let cmd = '';
    let workingMsg = 'Running...';
    let successMsg = '';

    switch (subCmd) {
      case 'install':
        if (args.length < 2) return reply('Missing package');
        cmd = 'npm install ' + args.slice(1).join(' ');
        workingMsg = 'Installing...';
        successMsg = 'Installed!';
        break;

      case 'uninstall':
      case 'remove':
        if (args.length < 2) return reply('Missing package');
        cmd = 'npm uninstall ' + args.slice(1).join(' ');
        workingMsg = 'Uninstalling...';
        successMsg = 'Uninstalled!';
        break;

      case 'list':
      case 'pkgs':
        cmd = 'npm list --depth=0';
        workingMsg = 'Fetching list...';
        successMsg = 'Installed packages:';
        break;

      case 'update':
        cmd = args.length === 1 ? 'npm update' : 'npm update ' + args.slice(1).join(' ');
        workingMsg = 'Updating...';
        successMsg = 'Updated!';
        break;

      case 'audit':
        cmd = 'npm audit --json';
        workingMsg = 'Scanning vulnerabilities...';
        successMsg = 'Security audit:';
        break;

      case 'fund':
        cmd = 'npm fund';
        workingMsg = 'Fetching funding info...';
        successMsg = 'Funding links:';
        break;

      default:
        return reply('Unknown command');
    }

    await reply(workingMsg + '\n`' + cmd + '`');

    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: '/home/container' });

      let output = (stdout + stderr).trim();

      if (output.length > 3500) output = output.substring(0, 3400) + '\n(truncated)';

      if (!output) output = 'Success (no output)';

      await reply(successMsg + '\n```\n' + output + '\n```');

    } catch (err) {
      // Special handling for audit (exit 1 = vulnerabilities found = normal)
      if (subCmd === 'audit' && err.code === 1) {
        let output = (err.stdout || '') + (err.stderr || '');
        output = output.trim();

        if (output.length > 3500) output = output.substring(0, 3400) + '\n(truncated)';

        if (!output) output = '(vulnerabilities found, but no detailed output)';

        await reply('Vulnerabilities found (normal):\n```\n' + output + '\n```');
      } else {
        let errMsg = err.message || 'Unknown error';
        if (err.code) errMsg += '\nExit code: ' + err.code;
        if (err.stdout) errMsg += '\nOutput: ' + err.stdout.substring(0, 1000);
        await reply('Failed:\n' + errMsg);
      }
    }
  }
};
