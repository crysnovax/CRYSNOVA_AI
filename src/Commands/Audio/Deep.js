const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "deep",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"asetrate=44100*0.75,atempo=0.9,volume=2"
)

}
}