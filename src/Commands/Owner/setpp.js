const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

module.exports = {
    name: "setpp",
    alias: ["setbotpp", "setppbot", "setprofilepic"],
    category: "owner",
    desc: "Change bot profile picture",

    reactions: {
        start: "📸",
        success: "✨"
    },

    execute: async (sock, m, { reply }) => {

        try {

            // ── Detect Image ─────────────────────────
            const quoted = m.quoted ? m.quoted : m
            const mime = (quoted.msg || quoted).mimetype || ""

            if (!/image/.test(mime)) {
                return reply(
`╭─❍ *SETPP*
│ ⚠️ Reply to an image
│ to set as bot profile
╰─ 𓄄`
                )
            }

            await sock.sendMessage(m.chat, {
                react: { text: "📸", key: m.key }
            })

            // ── Download Image ───────────────────────
            const stream = await downloadContentFromMessage(
                quoted.msg || quoted,
                "image"
            )

            let buffer = Buffer.from([])

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            // ── Update Profile Picture ───────────────
            await sock.updateProfilePicture(sock.user.id, buffer)

            await sock.sendMessage(m.chat, {
                react: { text: "✨", key: m.key }
            })

            reply(
`╭─❍ *PROFILE UPDATED*
│ ✦ Bot profile picture
│   changed successfully
╰─ 𓄄`
            )

        } catch (err) {

            console.error("SETPP ERROR:", err)

            reply(
`╭─❍ *ERROR*
│ ❌ Failed to update
│ bot profile picture
╰─ 𓄄`
            )
        }
    }
}