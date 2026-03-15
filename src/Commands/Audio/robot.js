const { convertAudio } = require('../Core/¿.js')

module.exports = {
name: "robot",
category: "audio",
desc: "Robot voice effect",

execute: async (sock, m) => {

await convertAudio(
sock,
m,
"afftfilt=real='hypot(re,im)':imag=0,volume=10,acompressor=threshold=-20dB:ratio=4:attack=5:release=50"
)

}
}