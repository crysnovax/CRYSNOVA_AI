const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "8d",
category: "audio",

execute: async (sock, m) => {

await convertAudio(sock, m,
"apulsator=hz=0.19:amount=0.8"
)

}
}
