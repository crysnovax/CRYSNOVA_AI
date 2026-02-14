module.exports = {
  command: 'all',
  alias: [],
  description: 'Tag all members in a channel invisibly (channel-only)',
  category: 'tools',
  owner: true, // owner-only if desired

  execute: async (sock, m, { reply }) => {
    try {
      if (!m.chat.endsWith('@broadcast')) 
        return reply('❌ This command only works in channels.');

      const metadata = await sock.groupMetadata(m.chat).catch(() => null);
      if (!metadata || !metadata.participants) 
        return reply('❌ Could not fetch channel members.');

      const mentions = metadata.participants.map(p => p.id);

      // Send empty text with mentions (invisible tag)
      await sock.sendMessage(m.chat, { 
        text: '\u200B', // zero-width space
        mentions
      }, { quoted: m });

    } catch (err) {
      console.error('Invisible all command error:', err);
      reply('❌ Failed to tag all members.');
    }
  }
};
