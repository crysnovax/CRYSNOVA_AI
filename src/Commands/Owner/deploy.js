const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../database/deploy.txt')

if (!fs.existsSync(DB)) fs.writeFileSync(DB, '')

module.exports = {
name: 'deploy',
alias: [],
category: 'tools',
desc: 'Save or return deploy script',

execute: async (sock, m, { args, text, reply }) => {

if (args[0] === 'add') {

const script = text.replace(/^add\s*/i, '')
if (!script) return reply('No script provided')

fs.writeFileSync(DB, script)

return reply('Deploy script saved')
}

if (args[0] === 'clear') {
fs.writeFileSync(DB, '')
return reply('Deploy script cleared')
}

const script = fs.readFileSync(DB, 'utf8')
if (!script) return reply('No deploy script saved')

reply(script)

}
}