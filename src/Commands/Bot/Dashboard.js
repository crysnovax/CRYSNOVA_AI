const { getByCategory } = require('../../Plugin/crysCmd');
const { getVar } = require('../../Plugin/configManager');
const examples = require('../Core/Example.js');

module.exports = {
  name: 'guide',
  alias: ['menutv', 'dash', 'dashboard'],
  category: 'Bot',

  execute: async (sock, m, { reply, prefix = '.' }) => {
    const jid = m.key.remoteJid;

    const botName = getVar('BOT_NAME', 'CRYSNOVA AI');
    const userName = m.pushName || m.sender.split('@')[0] || 'User';

    const categories = getByCategory();

    // build sections with examples
    const sections = Object.entries(categories).map(([cat, cmds]) => ({
      title: cat.toUpperCase(),
      rows: cmds.map(c => {
        const example = examples[c.name] || '';
        const fullCmd = `${prefix}${c.name}${example ? ' ' + example : ''}`;

        return {
          title: fullCmd, // shown
          rowId: fullCmd, // fills input
          description: c.desc || 'no description'
        };
      })
    }));

    const headerUrl = getVar(
      'THUMB_URL',
      'https://files.catbox.moe/z2rqc1.jpg'
    );

    try {
      await sock.sendMessage(
        jid,
        {
          text:
            `╭─❍ *${botName.toUpperCase()}*\n` +
           ` | ಠ_ಠ *𝓬𝓻𝔂𝓼𝓷𝓸𝓿𝓪 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭* _use in DM only_\n`+
            `│ ❏◦ User: ${userName}\n` +
            `│ ❏◦ Prefix: ${prefix}\n` +
            `│ ❏◦ Categories: ${Object.keys(categories).length}\n` +
            `╰──────────────────`,

          footer: '✧ crysnova • Neural Node 🔥 [ 𓊈𝑽꯭𝑰꯭𝑷ࠡࠡࠡࠡࠢ𓊉 ]',
          title: '彡TV GRID GUIDE',
          buttonText: '◥◣SELECT COMMAND◢◤',

          sections,

          header: {
            imageMessage: {
              url: headerUrl,
              mimetype: 'image/jpeg'
            }
          }
        },
        { quoted: m }
      );

    } catch (err) {
      console.error('[MENU ERROR]', err);
      await reply(`> FAILED: ${err.message}`);
    }
  }
};
