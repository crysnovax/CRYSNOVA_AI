const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const DATA_FILE = path.join(__dirname, '../../../database/vv-reactions.json');

let reactionTriggers = {};
let listenerAttached = false;

try {
  if (fs.existsSync(DATA_FILE)) {
    reactionTriggers = JSON.parse(fs.readFileSync(DATA_FILE));
  }
} catch {}

function saveTriggers() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reactionTriggers, null, 2));
}

module.exports = {
  name: 'vv',
  alias: ['viewonce', 'vview', 'vvp'],
  category: 'media',
  owner: true,
  reactions: {
    start: '👌',
    success: '🤫'
  },

  execute: async (sock, m, { args, reply }) => {
    try {
      const cmd = m.body.split(' ')[0].toLowerCase();
      const sender = m.sender;

      // ───── SET REACTION TRIGGER ─────
      if (cmd === '.vv' && args[0] === 'cmd' && args[1]) {
        reactionTriggers[sender] = args[1];
        saveTriggers();
        return reply(`╭─❍ *CRYSNOVA AI V2.0*\n│ ✓ Reaction trigger set: ${args[1]}\n╰──────────────────`);
      }

      // ───── MUST REPLY ─────
      let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Reply to a view-once message.\n╰──────────────────');
      }

      // unwrap ephemeral
      if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;

      // unwrap viewOnce
      if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;

      const type = Object.keys(quoted)[0];

      // ───── SUPPORTED TYPES ─────
      if (!['imageMessage','videoMessage','stickerMessage','audioMessage'].includes(type)) {
        return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Only view-once media/audio supported.\n╰──────────────────');
      }

      // ───── DOWNLOAD BUFFER ─────
      const stream = await downloadContentFromMessage(
        quoted[type],
        type.replace('Message','').toLowerCase()
      );

      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // ───── MAP TYPE TO SEND TYPE ─────
      const sendType =
        type === 'videoMessage'
          ? 'video'
          : type === 'imageMessage'
          ? 'image'
          : type === 'stickerMessage'
          ? 'sticker'
          : type === 'audioMessage'
          ? 'audio'
          : null;

      if (!sendType) return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Unsupported type.\n╰──────────────────');

      // ───── PRIVATE (.vvp) ─────
      if (cmd === '.vvp') {
        await sock.sendMessage(sender, {
          [sendType]: buffer,
          caption: `╭─❍ *CRYSNOVA AI V2.0*\n│ ✓ View-once saved privately.\n╰──────────────────`
        });
        return reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✓ Sent to your DM.\n╰──────────────────');
      }

      // ───── NORMAL (.vv) ─────
      await sock.sendMessage(m.chat, {
        [sendType]: buffer,
        caption: `╭─❍ *CRYSNOVA AI V2.0*\n│ ✓ View-once unlocked.\n╰──────────────────`
      }, { quoted: m });

      // ───── ATTACH REACTION LISTENER ONCE ─────
      if (!listenerAttached) {
        listenerAttached = true;

        sock.ev.on('messages.reaction', async (updates) => {
          try {
            const update = updates[0];
            const reactedEmoji = update.reaction?.text;
            const reactor = update.reaction?.senderId || update.reaction?.participant;

            if (!reactedEmoji || !reactionTriggers[reactor]) return;
            if (reactedEmoji !== reactionTriggers[reactor]) return;

            const msg = await sock.loadMessage(update.key.remoteJid, update.key.id);
            if (!msg?.message) return;

            let content = msg.message;
            if (content.ephemeralMessage) content = content.ephemeralMessage.message;
            if (content.viewOnceMessage) content = content.viewOnceMessage.message;

            const t = Object.keys(content)[0];
            if (!['imageMessage','videoMessage','stickerMessage','audioMessage'].includes(t)) return;

            const s = await downloadContentFromMessage(
              content[t],
              t.replace('Message','').toLowerCase()
            );

            let buf = Buffer.alloc(0);
            for await (const chunk of s) {
              buf = Buffer.concat([buf, chunk]);
            }

            const st =
              t === 'videoMessage'
                ? 'video'
                : t === 'imageMessage'
                ? 'image'
                : t === 'stickerMessage'
                ? 'sticker'
                : t === 'audioMessage'
                ? 'audio'
                : null;

            if (!st) return;

            await sock.sendMessage(reactor, {
              [st]: buf,
              caption: `╭─❍ *CRYSNOVA AI V2.0*\n│ ✓ View-once saved via reaction ${reactedEmoji}\n╰──────────────────`
            });

          } catch {}
        });
      }

    } catch (err) {
      console.error('[VV ERROR]', err);
      reply('╭─❍ *CRYSNOVA AI V2.0*\n│ ✘ Error unlocking view-once.\n╰──────────────────');
    }
  }
};
