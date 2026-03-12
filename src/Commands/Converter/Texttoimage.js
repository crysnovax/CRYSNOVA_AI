const { createCanvas } = require('canvas')
const sharp = require('sharp')

module.exports = {
    name: 'ttp',
    alias: ['text2sticker', 'textsticker', 'ttp'],
    category: 'Media',
    desc: 'Text to transparent sticker or large image',

    execute: async (sock, m, { args, reply, prefix }) => {

        let text = ''
        let color = '#ffffff' // default white
        let isLarge = false

        if (args.length > 0) {
            const first = args[0].toLowerCase()

            const colors = {
                red: '#ff0000', blue: '#0000ff', green: '#00ff00',
                yellow: '#ffff00', purple: '#800080', orange: '#ffa500',
                pink: '#ff69b4', cyan: '#00ffff', white: '#ffffff',
                black: '#000000', gray: '#808080'
            }

            if (colors[first]) {
                color = colors[first]
                text = args.slice(1).join(' ')
            } else if (first === 'large') {
                isLarge = true
                text = args.slice(1).join(' ')
            } else {
                text = args.join(' ')
            }
        }

        if (!text && m.quoted) {
            text = (m.quoted.text || m.quoted.caption || '').trim()
        }

        if (!text) {
            return reply(
                `⚉ Usage:\n` +
                `• ${prefix}ttp your text\n` +
                `• ${prefix}ttp red Crysnova\n` +
                `• ${prefix}ttp large Long text here`
            )
        }

        if (text.length > 150) text = text.substring(0, 147) + '...'

        try {

            await reply('_*✦ Creating text sticker/image...*_')

            const canvas = createCanvas(512, 512)
            const ctx = canvas.getContext('2d')

            ctx.clearRect(0, 0, 512, 512) // transparent bg

            let fontSize = 140
            ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`

            // auto reduce size if too long
            while (ctx.measureText(text).width > 460 && fontSize > 30) {
                fontSize -= 8
                ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`
            }

            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // outline + shadow
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = Math.max(5, fontSize / 12)
            ctx.shadowColor = 'rgba(0,0,0,0.8)'
            ctx.shadowBlur = 15
            ctx.shadowOffsetX = 5
            ctx.shadowOffsetY = 5

            ctx.strokeText(text, 256, 256)
            ctx.fillStyle = color
            ctx.fillText(text, 256, 256)

            const pngBuffer = canvas.toBuffer('image/png')

            // convert to webp sticker
            const stickerBuffer = await sharp(pngBuffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 90, lossless: false, effort: 6 })
                .toBuffer()

            if (isLarge) {
                await sock.sendMessage(m.chat, {
                    image: pngBuffer,
                    mimetype: 'image/png',
                 //   caption: `𓉤 Large transparent text\n${text}`
                }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, {
                    sticker: stickerBuffer
                }, { quoted: m })
            }

            reply('✦ *Done!* _Text sticker/image sent 𓄄_')

        } catch (e) {
            console.log('[TTP ERROR]', e.message)
            reply('_*✘ Failed to create text sticker/image*_')
        }
    }
}