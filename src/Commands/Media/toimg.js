const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const sharp = require('sharp')

module.exports = {
    name: 'toimg',
    alias: ['toimage', 'tovid', 'tovideo', 'stickertoimg'],
    category: 'Media',

    execute: async (sock, m, { reply }) => {

        const quoted = m.quoted || m
        const mime = quoted.mimetype || ''

        if (!/webp/.test(mime) && !quoted.isSticker)
            return reply('⚉ Reply to a sticker')

        try {

            const media = await quoted.download()
            
            const metadata = await sharp(media).metadata()
            const isAnimated = metadata.pages > 1

            const tempDir = path.join(__dirname, '../../temp')
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true })

            /* ================= ANIMATED STICKER (VIDEO) ================= */

            if (isAnimated) {
                
                const input = path.join(tempDir, `stk_${Date.now()}.webp`)
                const output = input.replace('.webp', '.mp4')
                
                fs.writeFileSync(input, media)

                const frameDir = path.join(tempDir, `frames_${Date.now()}`)
                fs.mkdirSync(frameDir, { recursive: true })

                // Extract all frames
                const framePromises = []
                for (let i = 0; i < metadata.pages; i++) {
                    framePromises.push(
                        sharp(media, { page: i })
                            .resize(512, 512, { fit: 'cover', position: 'center' })
                            .png()
                            .toFile(path.join(frameDir, `frame_${i.toString().padStart(4, '0')}.png`))
                    )
                }

                await Promise.all(framePromises)

                // Safe framerate calculation (default 15fps if delay missing)
                const delay = metadata.delay || metadata.pageDelay || 100
                const fps = delay > 0 ? Math.round(1000 / delay) : 15

                const videoCmd = `ffmpeg -y -framerate ${fps} -i "${path.join(frameDir, 'frame_%04d.png')}" -vf "format=yuv420p" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${output}"`

                await new Promise((resolve, reject) => {
                    exec(videoCmd, (err) => {
                        fs.rmSync(frameDir, { recursive: true, force: true })
                        if (err) reject(err)
                        else resolve()
                    })
                })

                const buffer = fs.readFileSync(output)

                await sock.sendMessage(
                    m.chat,
                    { video: buffer, mimetype: 'video/mp4' },
                    { quoted: m }
                )

                fs.unlinkSync(input)
                fs.unlinkSync(output)

            }

            /* ================= STATIC STICKER (IMAGE) ================= */

            else {

                const pngBuffer = await sharp(media)
                    .resize(512, 512, { fit: 'cover', position: 'center' })
                    .png()
                    .toBuffer()

                await sock.sendMessage(
                    m.chat,
                    { image: pngBuffer, mimetype: 'image/png' },
                    { quoted: m }
                )

            }

        } catch (e) {
            reply(`✘ Failed: ${e.message}`)
        }
    }
}
