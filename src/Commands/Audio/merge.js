const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "merge",
category: "audio",

execute: async (sock, m) => {

await convertAudio(sock, m,
"volume=2"
)

}
}
