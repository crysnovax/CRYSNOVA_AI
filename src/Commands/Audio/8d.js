const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "8d",
category: "audio",

execute: async (sock, m) => {

await convertAudio(sock, m,
"apulsator=hz=0.15:amount=0.9"
)

}
}
