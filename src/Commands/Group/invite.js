const fetch = require('node-fetch')
const { prepareWAMessageMedia, generateMessageIDV2, extractImageThumb } = require('@crysnovax/baileys')

module.exports = {
    name: 'invite',
    alias: ['grouplink', 'glink'],
    category: 'Group',
    admin: true,
    group: true,

    execute: async (sock, m, { reply }) => {
        try {
            if (!m.isGroup) return reply('`⟁⃝GROUP ONLY!℘`')

            const meta = await sock.groupMetadata(m.chat)
            const groupName = meta.subject

            // ── Get invite code ───────────────────────
            let inviteCode
            try {
                inviteCode = await sock.groupInviteCode(m.chat)
            } catch (err) {
                return reply('`—͟͟͞͞𖣘 I need admin rights to generate the group link`')
            }

            const inviteLink = `https://chat.whatsapp.com/${inviteCode}?mode=gi_t`

            // ── Get group photo, generate small jpegThumbnail ──
            let photoBuffer = null
            let smallThumb = null
            try {
                const pp = await sock.profilePictureUrl(m.chat, 'image')
                photoBuffer = await fetch(pp).then(r => r.buffer())
                // WA's extendedTextMessage jpegThumbnail field has an undocumented
                // size ceiling around ~7KB before the client fails to render it
                // (shows blank/black). 296px @ quality 50 sits safely under that
                // while staying as sharp as reliably possible.
                const { buffer } = await extractImageThumb(photoBuffer, 296)
                smallThumb = buffer
            } catch (err) {
                console.error('THUMB GENERATION ERROR:', err)
            }

            // ── Upload photo through real media pipeline
            // to get proper highQualityThumbnail fields ──
            let img = null
            if (photoBuffer) {
                try {
                    const prepared = await prepareWAMessageMedia(
                        { image: photoBuffer },
                        { upload: sock.waUploadToServer }
                    )
                    img = prepared.imageMessage
                } catch (err) {
                    console.error('HQ THUMB UPLOAD ERROR:', err)
                }
            }

            // ── Build the actual proto.Message manually ───────
            // generateWAMessage() does NOT recognize a raw
            // extendedTextMessage key in content, so it silently
            // mishandles it. We bypass it entirely and relay
            // a correctly-shaped Message object ourselves.
            const message = {
                extendedTextMessage: {
                    text: inviteLink,
                    matchedText: inviteLink,
                    canonicalUrl: inviteLink,
                    title: groupName,
                    description: `${meta.participants.length} members · WhatsApp Group Invite`,
                    previewType: 5, // IMAGE
                    jpegThumbnail: smallThumb || undefined,
                    ...(img
                        ? {
                            thumbnailDirectPath: img.directPath,
                            mediaKey: img.mediaKey,
                            mediaKeyTimestamp: img.mediaKeyTimestamp,
                            thumbnailWidth: img.width,
                            thumbnailHeight: img.height,
                            thumbnailSha256: img.fileSha256,
                            thumbnailEncSha256: img.fileEncSha256
                        }
                        : {})
                }
            }

            const messageId = generateMessageIDV2(sock.user.id)

            await sock.relayMessage(m.chat, message, { messageId })

        } catch (e) {
            console.error('GLINK ERROR:', e)
            reply(`𓆉 Error: ${e.message}`)
        }
    }
}

