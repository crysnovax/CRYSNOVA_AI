const { downloadContentFromMessage } = require('@itsliaaa/baileys');

module.exports = {
    name:     'addstatus',
    alias:    ['poststatus', 'setstatus'],
    desc:     'Post a status on your WhatsApp',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '📤', success: '✅' },

    execute: async (sock, m, { args, reply }) => {
        const mtype      = m.mtype
        const isImage    = mtype === 'imageMessage'
        const isVideo    = mtype === 'videoMessage'
        const hasQuoted  = !!m.quoted
        const quotedType = m.quoted?.mtype

        // ── Text status ───────────────────────────────────────
        if (!isImage && !isVideo && !hasQuoted) {
            const text = args.join(' ').trim()
            if (!text) {
                return reply(
                    `*How to use:*\n\n` +
                    `• _.addstatus Good morning! 🌅_ → text status\n` +
                    `• _Send image + caption .addstatus_ → image status\n` +
                    `• _Reply to image with .addstatus_ → post that image`
                )
            }
            try {
                await sock.sendMessage('status@broadcast', { text })
                return reply('_*✓ Text status posted!*_')
            } catch (err) {
                return reply(`_✘ Failed: ${err.message}_`)
            }
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})

            let buffer, mime, type, caption

            const download = async (msgObj, msgType) => {
                const stream = await downloadContentFromMessage(
                    msgObj,
                    msgType.replace('Message', '').toLowerCase()
                )
                let buf = Buffer.alloc(0)
                for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                return buf
            }

            if (isImage || isVideo) {
                // Media sent directly with command
                const rawMsg = m.message?.[mtype]
                if (!rawMsg) return reply('_✘ Could not read media. Try again._')
                buffer  = await download(rawMsg, mtype)
                mime    = rawMsg.mimetype || (isImage ? 'image/jpeg' : 'video/mp4')
                type    = isImage ? 'image' : 'video'
                caption = args.join(' ').trim()

            } else if (hasQuoted && ['imageMessage', 'videoMessage'].includes(quotedType)) {
                // Replied to media
                const rawQuoted = m.msg?.contextInfo?.quotedMessage?.[quotedType]
                if (!rawQuoted) return reply('_✘ Could not read quoted media. Try again._')
                buffer  = await download(rawQuoted, quotedType)
                mime    = rawQuoted.mimetype || (quotedType === 'imageMessage' ? 'image/jpeg' : 'video/mp4')
                type    = quotedType === 'imageMessage' ? 'image' : 'video'
                caption = args.join(' ').trim()
            } else {
                return reply('_✘ Only images and videos can be posted as status._')
            }

            if (!buffer?.length) return reply('_✘ Download failed. Try again._')

            await sock.sendMessage('status@broadcast', {
                [type]:   buffer,
                mimetype: mime,
                ...(caption ? { caption } : {})
            })

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {})
            reply(`_*✓ ${type === 'image' ? '🖼️ Image' : '🎥 Video'} status posted!*_`)

        } catch (err) {
            console.error('[ADDSTATUS ERROR]', err.message)
            reply(`_✘ Failed: ${err.message}_`)
        }
    }
}

