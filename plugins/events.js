const fs = require('fs')
const path = './database/groupEvents.json'

if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))

module.exports = {
  command: 'events',
  description: 'Toggle group event system',
  category: 'group',
  group: true,
  admin: true,

  execute: async (sock, m, { reply }) => {
    const args = m.body.split(' ')
    const option = args[1]

    const db = JSON.parse(fs.readFileSync(path))
    if (!db[m.chat]) db[m.chat] = { enabled: false, welcome: null, goodbye: null }

    if (!option) {
      return reply(
`📌 *GROUP EVENTS SYSTEM*

Usage:
.events on
.events off

Available Features:
• Premium Welcome Card
• Goodbye Messages
• Editable Welcome Text
• Member Count Display
• Join Time Display
• @User Tagging
• Future: Online Tracker`
      )
    }

    if (option === 'on') {
      db[m.chat].enabled = true
      fs.writeFileSync(path, JSON.stringify(db, null, 2))
      return reply('✓ *Group Events Enabled Successfully!*')
    }

    if (option === 'off') {
      db[m.chat].enabled = false
      fs.writeFileSync(path, JSON.stringify(db, null, 2))
      return reply('✘ *Group Events Disabled!⚉*')
    }
  }
}
