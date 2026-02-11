module.exports = {
  command: 'restart',
  description: 'Restart the bot safely',
  category: 'system',

  execute: async (sock, m, { reply, isCreator }) => {

    // OWNER ONLY
    if (!isCreator) {
      await sock.sendMessage(m.chat, {
        react: { text: '🔒', key: m.key }
      })
      return reply('Restart is owner-only')
    }

    // Reaction: starting restart
    await sock.sendMessage(m.chat, {
      react: { text: '♻️', key: m.key }
    })
    await reply('Bot is restarting...')

    // Actually restart
    process.exit(0)
  }
}
