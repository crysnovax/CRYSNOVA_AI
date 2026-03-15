const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "bass",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"bass=g=20,volume=2,acompressor=threshold=-25dB:ratio=3"
)

}
}