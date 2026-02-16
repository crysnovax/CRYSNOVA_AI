module.exports = {
  command: 'welcome',
  group: true,
  admin: true,

  execute: async (sock, m, { reply }) => {
    const fs = require('fs')
    const path = './database/groupEvents.json'
    const db = JSON.parse(fs.readFileSync(path))

    if (!db[m.chat] || !db[m.chat].enabled)
      return reply('✘ Events are not enabled in this group.')

    const text = m.body.replace('.welcome', '').trim()
    if (!text) return reply('Provide a welcome message.')

    db[m.chat].welcome = text
    fs.writeFileSync(path, JSON.stringify(db, null, 2))

    reply('✓ Welcome message updated successfully!')
  }
}
