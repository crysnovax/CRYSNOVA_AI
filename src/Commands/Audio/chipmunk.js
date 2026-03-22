const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "chipmunk",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"asetrate=44100*1.15,atempo=0.5,aresample=44100"
)

}
}
