const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "reverse",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"areverse"
)

}
}