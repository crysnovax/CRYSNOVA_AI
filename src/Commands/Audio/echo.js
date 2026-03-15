const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "echo",
category: "audio",

execute: async (sock, m) => {

await convertAudio(sock, m,
"aecho=0.8:0.88:60:0.4"
)

}
}