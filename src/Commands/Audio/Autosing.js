const fs = require('fs')
const path = require('path')
const gtts = require('node-gtts')('en')
const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "autosing",
category: "audio",

execute: async (sock, m, { args }) => {

let text = args.join(" ")

if (!text && m.quoted) {
text = m.quoted.text
}

if (!text) {
return sock.sendMessage(m.chat,{
text:"Give text to sing.\nExample: .autosing hello world"
},{quoted:m})
}

const tempDir = './temp'
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

const input = `${tempDir}/${Date.now()}_tts.mp3`

await new Promise((resolve, reject) => {
gtts.save(input, text, (err) => {
if (err) reject(err)
else resolve()
})
})

// Now send as voice note WITH effect
const media = fs.readFileSync(input)

await sock.sendMessage(m.chat,{
audio: media,
mimetype: 'audio/mpeg',
ptt: true
},{quoted:m})

fs.unlinkSync(input)

}
}