module.exports = {
    name: 'doc',
    alias: ['document', 'todoc', 'senddoc'],
    category: 'Documents',
    desc: 'Convert replied media to document with custom name',
     // ⭐ Reaction config
    reactions: {
        start: '✏️',
        success: '📃'
    },
    

    execute: async (sock, m, { args, reply, prefix }) => {
        try {
            const quoted = m.quoted

            if (!quoted) {
                return reply(`_*⚉ Reply to any media (image/video/audio/sticker) with*_ _*${prefix}doc*_`)
            }

            const mime = quoted.mimetype || ''
            if (!mime) {
                return reply('_*⚉ No media found in replied message*_')
            }

            let fileName = args.join(' ').trim() || 'file_from_crysnova'
            
            // Clean filename & add extension based on mime
            let ext = 'file'
            if (mime.startsWith('image/')) ext = 'jpg'
            else if (mime.startsWith('video/')) ext = 'mp4'
            else if (mime.startsWith('audio/')) ext = 'mp3'
            else if (mime === 'image/webp') ext = 'webp'
            else if (mime.includes('pdf')) ext = 'pdf'

            if (!fileName.toLowerCase().endsWith(`.${ext}`)) {
                fileName += `.${ext}`
            }

            await reply('_✦ Preparing document..._')

            const buffer = await quoted.download()
            if (!buffer || buffer.length < 100) {
                return reply('✘ Failed to download media')
            }

            await sock.sendMessage(m.chat, {
                document: buffer,
                mimetype: mime,
                fileName: fileName,
                caption: `_*𓉤 Document:*_ *${fileName}*\n_*From:*_ _*CRYSNOVA AI*_`
            }, { quoted: m })

            reply('_*✦ Sent as document! Tap to download.*_')

        } catch (e) {
            console.log('[DOC ERROR]', e.message)
            reply('✘ Failed to send as document')
        }
    }
}