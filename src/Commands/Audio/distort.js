const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "distort",
category: "audio",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"acrusher=bits=4:mix=0.8,volume=2"
)

}
}