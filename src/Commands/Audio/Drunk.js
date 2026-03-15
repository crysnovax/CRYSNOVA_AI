const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "drunk",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"asetrate=44100*0.9,atempo=0.8,atempo=1.1,volume=2"
)

}
}