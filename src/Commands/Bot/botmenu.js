const { generateWAMessageFromContent } = require('@itsliaaa/baileys');

module.exports = {
  name: 'botmenu',
  alias: ['hp', 'dashboard', 'start', 'cyber'],
  category: 'general',

  execute: async (sock, m, { reply, prefix = '!' }) => {
    const jid = m.key.remoteJid;

    const boot = await reply('```\n> NEURAL GRID BOOTING...\n> TRACE MASKED | LATENCY 47ms```');
    setTimeout(() => sock.sendMessage(jid, { delete: boot.key }).catch(() => {}), 1400);

    const headerUrl = 'https://media.crysnovax.workers.dev/230e81dc-61f3-41aa-9850-6d17c8a6b281.jpg';

    const sections = [
      {
        title: '◢◤ N E U R A L C O R E ◢◤',
        rows: [
          { title: 'Chat Core', rowId: `${prefix}ai`, description: 'Direct thought uplink' },
          { title: 'Vision Decode', rowId: `${prefix}vision`, description: 'Image / video matrix scan' },
          { title: 'Voice Decrypt', rowId: `${prefix}transcribe`, description: 'Audio waveform breach' }
        ]
      },
      // Other section data...
    ];

    try {
      await sock.sendMessage(jid, {
        text: '```\nCRYSNOVA v3 // DARKNET ACCESS\nSYSTEM STATUS: ONLINE\n> ENTER CATEGORY MATRIX```',
        footer: 'crysnova • Benin Node 🔥 [ SECURED ]',
        title: 'NEURAL GRID ACCESS',
        buttonText: 'BREACH GRID',
        sections: sections,
        header: {
          imageMessage: {
            url: headerUrl,
            mimetype: 'image/jpeg'
          }
        }
      }, { quoted: m });

      await reply('> Grid breached. Select access vector.');
    } catch (err) {
      console.error('[MENU ERROR]', err);
      await reply(`> BREACH FAILED: ${err.message}`);
    }
  }
};
