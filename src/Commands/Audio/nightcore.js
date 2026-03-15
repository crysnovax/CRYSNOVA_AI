const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "nightcore",
category: "audio",

execute: async (sock, m) => {

await convertAudio(sock, m,
"asetrate=48000*1.25,atempo=1.1,aresample=48000"
)

}
}