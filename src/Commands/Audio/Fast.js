const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "fast",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"atempo=1.5,volume=1.8"
)

}
}