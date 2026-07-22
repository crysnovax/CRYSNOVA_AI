const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const sharp = require('sharp')
const ffmpeg = require('fluent-ffmpeg')

module.exports = {
    name: 'togif',
    alias: ['sticker2gif', 'stktogif', 'video2gif', 'v2gif'],
    category: 'Media',
    desc: 'Convert sticker or video to GIF with watermark',

    execute: async (sock, m, { reply }) => {

        const quoted = m.quoted || m
        const mime = quoted.mimetype || ''

        // Check if it's a sticker or video
        const isSticker = /webp/.test(mime) || quoted.isSticker
        const isVideo = /video/.test(mime)

        if (!isSticker && !isVideo)
            return reply('⚉ Reply to a sticker or video')

        try {

            const media = await quoted.download()
            const tempDir = path.join(__dirname, '../../temp')
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir, { recursive: true })

            const input = path.join(tempDir, `media_${Date.now()}.${isSticker ? 'webp' : 'mp4'}`)
            fs.writeFileSync(input, media)

            const output = path.join(tempDir, `gif_${Date.now()}.mp4`)

            if (isSticker) {
                // Handle sticker (webp)
                const metadata = await sharp(media).metadata()
                const isAnimated = metadata.pages > 1

                if (isAnimated) {
                    // Animated sticker → GIF
                    const frameDir = path.join(tempDir, `frames_${Date.now()}`)
                    fs.mkdirSync(frameDir)

                    const frames = []
                    for (let i = 0; i < metadata.pages; i++) {
                        const frameFile = path.join(frameDir, `frame_${String(i).padStart(4, '0')}.png`)
                        frames.push(
                            sharp(media, { page: i })
                                .resize(512, 512, { fit: 'cover' })
                                .png()
                                .toFile(frameFile)
                        )
                    }
                    await Promise.all(frames)

                    const delay = metadata.delay || 100
                    const fps = Math.round(1000 / delay) || 15

                    await convertFramesToGif(frameDir, output, fps)
                    
                    fs.rmSync(frameDir, { recursive: true, force: true })

                } else {
                    // Static sticker → static image
                    const img = await sharp(media)
                        .resize(512, 512, { fit: 'cover' })
                        .png()
                        .toBuffer()

                    await sock.sendMessage(
                        m.chat,
                        { image: img, caption: '⩇⩇:⩇⩇ .gif' },
                        { quoted: m }
                    )
                    
                    fs.unlinkSync(input)
                    return
                }

            } else {
                // Handle video → GIF
                await convertVideoToGif(input, output)
            }

            // Send the GIF
            const buffer = fs.readFileSync(output)
            await sock.sendMessage(
                m.chat,
                {
                    video: buffer,
                    gifPlayback: true,
                    caption: '⩇⩇:⩇⩇ .GIF'
                },
                { quoted: m }
            )

            // Cleanup
            fs.unlinkSync(input)
            fs.unlinkSync(output)

        } catch (e) {
            console.error('[TOGIF ERROR]', e)
            reply('✘ Failed to convert: ' + e.message)
        }
    }
}

// Helper: Convert frames to GIF with watermark
function convertFramesToGif(frameDir, output, fps) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -y -framerate ${fps} -i "${frameDir}/frame_%04d.png" -vf "scale=512:-1:flags=lanczos,drawtext=text='':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=30:fontcolor=white@0.6:borderw=2:bordercolor=black@0.7" -loop 0 -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${output}"`
        
        exec(cmd, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
}

// Helper: Convert video to GIF with watermark
function convertVideoToGif(input, output) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -y -i "${input}" -vf "fps=15,scale=512:-1:flags=lanczos,drawtext=text='':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=30:fontcolor=white@0.6:borderw=2:bordercolor=black@0.7" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "${output}"`
        
        exec(cmd, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
}
