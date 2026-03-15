const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "reverb",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"aecho=0.8:0.9:1000:0.5,volume=2"
)

}
}