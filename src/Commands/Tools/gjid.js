module.exports = {
    name: 'gjid',
    alias: ['groupjid'],
    desc: 'Extract group JID from invite link',
    category: 'Tools',

    reactions: {
        start: '🐜',
        success: '🍃'
    },

    execute: async (sock, m, { reply, args, usedPrefix, command: cmdName }) => {
        try {
            const prefix = usedPrefix || '.'
            const command = cmdName || 'gjid'

            let url = args[0] || ''

            // If replying to a message containing a link
            if (!url && m.quoted) {
                const quotedText = m.quoted.text || m.quoted.conversation || m.quoted.caption || ''
                const match = quotedText.match(/chat\.whatsapp\.com\/[^\s]+/)
                if (match) url = match[0]
            }

            if (!url) {
                return reply(
`╭─❍ *GJID*
│ ಥ⁠‿⁠ಥ Provide a group invite link
│
│ Usage:
│ • ${prefix}${command} https://chat.whatsapp.com/ABC123
│ • Reply to a message containing a link
╰─ 𓄄`
                )
            }

            // Extract invite code from various URL formats
            const patterns = [
                /chat\.whatsapp\.com\/([A-Za-z0-9]{22,})/,           // standard
                /chat\.whatsapp\.com\/invite\/([A-Za-z0-9]{22,})/,   // with /invite/
                /chat\.whatsapp\.com\/([A-Za-z0-9]{22,})\?/,         // with query params
            ]

            let code = null
            for (const pattern of patterns) {
                const match = url.match(pattern)
                if (match) {
                    code = match[1]
                    break
                }
            }

            if (!code) {
                // Try raw code if user pasted just the code
                if (/^[A-Za-z0-9]{22,}$/.test(url)) {
                    code = url
                } else {
                    return reply(
`╭─❍ *GJID*
│ ಠ_ಠ Invalid invite link
│
│ Expected format:
│ • https://chat.whatsapp.com/ABC123...
│ • chat.whatsapp.com/ABC123...
╰─ 𓄄`
                    )
                }
            }

            await sock.sendMessage(m.chat, { react: { text: '🔗', key: m.key } })

            // Fetch group info from invite code to get actual JID
            let groupInfo
            try {
                groupInfo = await sock.groupGetInviteInfo(code)
            } catch (err) {
                return reply(
`╭─❍ *GJID*
│ ಠ_ಠ Could not fetch group info
│ The link may be expired or invalid
│
│ ${err.message}
╰─ 𓄄`
                )
            }

            const groupJid = groupInfo.id
            const subject = groupInfo.subject || 'Unknown'
            const participants = groupInfo.size || groupInfo.participants?.length || '?'

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

            reply(
`╭─❍ *GROUP JID*
│ ( ͡❛ ₃ ͡❛) Link resolved
│
│ ❏◦ Name  · ${subject}
│ ❏◦ JID   · ${groupJid}
│ ❏◦ Members · ${participants}
│
│ Copied to clipboard!
╰─ 𓄄`
            )

            // Send JID as a separate copyable message
            await sock.sendMessage(m.chat, { text: groupJid })

        } catch (err) {
            console.error('GJID ERROR:', err)
            reply(
`╭─❍ *ERROR*
│ ಠ_ಠ Failed: ${err.message}
╰─ 𓄄`
            )
        }
    }
}
