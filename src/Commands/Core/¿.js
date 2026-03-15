const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

const tempDir = path.join(__dirname, '../../../temp')

// ── Ensure temp folder exists ──
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
}

// ── Auto clean old temp files (10 mins) ──
function cleanOldFiles() {
    try {
        const files = fs.readdirSync(tempDir)
        const now = Date.now()

        files.forEach(file => {
            const filePath = path.join(tempDir, file)
            const stats = fs.statSync(filePath)

            if (now - stats.mtimeMs > 10 * 60 * 1000) {
                fs.unlinkSync(filePath)
            }
        })
    } catch (e) {}
}

async function convertAudio(sock, m, filter) {

    cleanOldFiles()

    if (!m.quoted) {
        return sock.sendMessage(
            m.chat,
            { text: 'Reply to an audio or voice note' },
            { quoted: m }
        )
    }

    try {

        const media = await m.quoted.download()

        const input = path.join(tempDir, `${Date.now()}_in.mp3`)
        const output = path.join(tempDir, `${Date.now()}_out.ogg`)

        fs.writeFileSync(input, media)

        return new Promise((resolve) => {

            ffmpeg(input)
                .audioFilters(filter)
                .audioCodec('libopus')
                .audioBitrate('128k')
                .format('ogg')
                .on('end', async () => {

                    try {
                        await sock.sendMessage(
                            m.chat,
                            {
                                audio: fs.readFileSync(output),
                                mimetype: 'audio/ogg; codecs=opus',
                                ptt: true
                            },
                            { quoted: m }
                        )
                    } catch {}

                    // Safe cleanup
                    if (fs.existsSync(input)) fs.unlinkSync(input)
                    if (fs.existsSync(output)) fs.unlinkSync(output)

                    resolve()
                })
                .on('error', (err) => {
                    console.log('[FFMPEG ERROR]', err.message)

                    if (fs.existsSync(input)) fs.unlinkSync(input)
                    resolve()
                })
                .save(output)

        })

    } catch (err) {
        console.log('[CONVERT ERROR]', err.message)
    }

}

module.exports = { convertAudio }