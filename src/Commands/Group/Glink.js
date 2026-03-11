module.exports = {
    name: 'glink',
    alias: ['grouplink','gclink'],
    category: 'group',
    desc: 'Get group invite link with preview',

    execute: async (sock, m, { reply }) => {

        if (!m.isGroup) return reply('✘ Group only')

        try {
            const metadata = await sock.groupMetadata(m.chat)
            const code = await sock.groupInviteCode(m.chat)
            const link = `https://chat.whatsapp.com/${code}`

            // Get group icon URL
            let iconUrl = null
            try {
                const buffer = await sock.profilePictureUrl(m.chat, 'image')
                iconUrl = buffer
            } catch {} // fallback: leave null if no icon

            await sock.sendMessage(
                m.chat,
                {
                    text: `╭──────────────\n│ *GROUP LINK*\n╰──────────────\n${link}`,
                    contextInfo: {
                        externalAdReply: {
                            title: metadata.subject,
                            body: "Tap to open group invite",
                            sourceUrl: link,
                            thumbnailUrl: iconUrl || undefined,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                },
                { quoted: m }
            )

        } catch (err) {
            console.log(err)
            reply('✘ Failed to fetch group link')
        }
    }
}