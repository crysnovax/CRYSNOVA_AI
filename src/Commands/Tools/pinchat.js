module.exports = {
    name: 'pinchat',
    alias: [],
    desc: 'Pin/unpin a chat',
    category: 'Tools',

    reactions: {
        start: '📌',
        success: '🐾'
    },

    execute: async (sock, m, { reply, args, usedPrefix, command: cmdName }) => {
        try {
            const prefix = usedPrefix || '.'
            const command = cmdName || 'pinchat'

            let target = args[0] || ''
            const subCmd = args[0]?.toLowerCase()

            // Check for unpin subcommand
            const isUnpin = subCmd === 'unpin' || subCmd === 'remove'
            if (isUnpin) {
                target = args[1] || ''
            }

            // Resolve target JID
            if (!target) {
                // If in a group, use group JID
                target = m.chat
            }

            // Normalize JID
            if (!target.includes('@')) {
                target = `${target}@s.whatsapp.net`
            }

            // Prevent pinning status broadcast or self
            if (target === 'status@broadcast' || target === sock.user?.id) {
                return reply(
`╭─❍ *PINCHAT*
│ ಠ_ಠ Cannot pin this chat
╰─ 𓄄`
                )
            }

            await sock.sendMessage(m.chat, { react: { text: '📌', key: m.key } })

            // Use existing chatModify with pin
            await sock.chatModify({
                pin: !isUnpin
            }, target)

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

            reply(
`╭─❍ *PINCHAT*
│ ( ͡❛ ₃ ͡❛) Chat ${isUnpin ? 'unpinned' : 'pinned'}
│ ❏◦ JID · ${target}
╰─ 𓄄`
            )

        } catch (err) {
            console.error('PINCHAT ERROR:', err)
            reply(
`╭─❍ *ERROR*
│ ಠ_ಠ Failed: ${err.message}
╰─ 𓄄`
            )
        }
    }
}

