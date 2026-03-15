const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "tremolo",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"tremolo"
)

}
}