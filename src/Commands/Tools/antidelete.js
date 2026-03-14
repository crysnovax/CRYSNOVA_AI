const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname,'../../database/antidelete.json')

if(!fs.existsSync(DB)) fs.writeFileSync(DB,'{}')

const getDB = () => JSON.parse(fs.readFileSync(DB))
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2))

module.exports = {
name: 'antidelete',
alias: ['deletedetect'],
category: 'tools',
desc: 'Send deleted messages to owner DM',

execute: async (sock, m, { args, reply }) => {

const db = getDB()

if (!args[0]) {
return reply(
`╭─❍ *ANTI-DELETE SYSTEM* 𓉤\n` +
`│ Usage:\n` +
`│ .antidelete on\n` +
`│ .antidelete off\n` +
`╰────────────────`
)
}

if (args[0].toLowerCase() === 'on') {
db[m.chat] = true
saveDB(db)
return reply('╭─❍ *ANTI-DELETE ENABLED* ✓\n╰─ Protection Active')
}

if (args[0].toLowerCase() === 'off') {
delete db[m.chat]
saveDB(db)
return reply('╭─❍ *ANTI-DELETE DISABLED* ✘\n╰─ Protection Removed')
}

}
}

module.exports.onDelete = async (sock, update, store) => {

try {

const db = getDB()

for (const msg of update) {

if (msg.update?.message === null) {

const chat = msg.key.remoteJid
if (!db[chat]) continue

const deleted = await store.loadMessage(chat, msg.key.id)
if (!deleted) continue

const sender = deleted.key.participant || deleted.key.remoteJid

const text =
deleted.message?.conversation ||
deleted.message?.extendedTextMessage?.text ||
'[Media Message]'

const owner = sock.user.id.split(':')[0] + '@s.whatsapp.net'

await sock.sendMessage(owner, {
text:
`╭─❍ *DELETED MESSAGE DETECTED* 𓄄\n` +
`│ 👤 Sender: @${sender.split('@')[0]}\n` +
`│ 💬 Chat: ${chat}\n\n` +
`│ 📄 Message:\n${text}\n` +
`╰────────────────`,
mentions: [sender]
})

}

}

} catch (e) {
console.log('ANTI-DELETE ERROR:', e)
}

}