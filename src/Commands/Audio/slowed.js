const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "slow",
category: "audio",
desc: "Very slow effect",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"asetrate=48000*0.65,atempo=0.75,atempo=0.75,aresample=48000,volume=1.8"
)

}
}