const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

let customEmoji = null;
let ownerJid = null;
let listenerAttached = false;

module.exports = {
  command: 'vv',
  alias: ['viewonce', 'vview'],
  description: 'Download view-once & private unlock (Owner Only)',
  category: 'media',

  execute: async (sock, m, { reply, args, isCreator }) => {
    try {

      // Save owner JID once
      if (isCreator) ownerJid = m.sender;

      // 🔐 Set custom emoji
      if (args[0] === 'cmd' && args[1]) {
        if (!isCreator) return reply('Owner only command.');
        customEmoji = args[1];
        return reply(`✓ vv cmd ${customEmoji} set successfully`);
      }

      // Attach reaction listener only once
      if (!listenerAttached) {
        listenerAttached = true;

        sock.ev.on('messages.reaction', async (updates) => {
          try {
            if (!customEmoji || !ownerJid) return;

            const { key, reaction } = updates[0];
            if (!reaction?.text) return;

            // Check emoji match
            if (reaction.text !== customEmoji) return;

            // Check owner reacted
            const reactor = reaction.senderId || reaction.participant;
            if (reactor !== ownerJid) return;

            const msg = await sock.loadMessage(key.remoteJid, key.id);
            if (!msg?.message) return;

            let content = msg.message?.ephemeralMessage?.message || msg.message;
            const type = Object.keys(content)[0];

            if (!['imageMessage','videoMessage','stickerMessage'].includes(type)) return;

            const stream = await downloadContentFromMessage(
              content[type],
              type.replace('Message','').toLowerCase()
            );

            let buffer = Buffer.alloc(0);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }

            // Send privately to owner
            await sock.sendMessage(ownerJid, {
              [type === 'videoMessage'
                ? 'video'
                : type === 'imageMessage'
                ? 'image'
                : 'sticker']: buffer,
              caption: '📥 Private view-once unlocked'
            });

            // 🗑 Delete the reaction after forward
            await sock.sendMessage(key.remoteJid, {
              react: {
                text: '',
                key: key
              }
            });

          } catch (err) {
            console.log('Reaction error:', err.message);
          }
        });
      }

      // Normal .vv (public unlock)
      let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return reply('Reply to a view-once message with .vv');

      if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;

      const type = Object.keys(quoted)[0];
      if (!['imageMessage','videoMessage','stickerMessage'].includes(type))
        return reply('Only view-once media supported');

      const stream = await downloadContentFromMessage(
        quoted[type],
        type.replace('Message','').toLowerCase()
      );

      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      await sock.sendMessage(m.chat, {
        [type === 'videoMessage'
          ? 'video'
          : type === 'imageMessage'
          ? 'image'
          : 'sticker']: buffer,
        caption: '✅ View-once media opened'
      }, { quoted: m });

    } catch (err) {
      console.log(err);
      reply('Error unlocking view-once.');
    }
  }
};
