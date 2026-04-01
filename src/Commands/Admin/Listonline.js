module.exports = {
    name: 'listonline',
    alias: ['active', 'here', 'whoisonline', 'onlinelist'],
    desc: 'List online users in the group',
    category: 'Admin',
    groupOnly: true,
    reactions: { start: '👀', success: '📝' },

    execute: async (sock, m, { reply }) => {
        try {
            const meta         = await sock.groupMetadata(m.chat)
            const participants = meta.participants || []

            if (!participants.length) return reply('✘ No participants found')

            // Subscribe to presence for this group
            try { await sock.presenceSubscribe(m.chat) } catch {}

            // Give WhatsApp time to send presence updates
            await reply('⚉ _Checking presence... please wait_')
            await new Promise(r => setTimeout(r, 4000))

            const online  = []
            const offline = []

            for (const p of participants) {
                const jid    = p.id
                const num    = jid.split('@')[0]
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin'

                // Get name
                let name = num
                try {
                    const contacts = sock.store?.contacts
                    const contact  = contacts instanceof Map
                        ? contacts.get(jid)
                        : contacts?.[jid]
                    if (contact?.notify?.trim())       name = contact.notify
                    else if (contact?.name?.trim())    name = contact.name
                } catch {}

                // Check presence from global set (set by presence.update event)
                let status = null
                try {
                    const p1 = sock.store?.presences?.[jid]?.lastKnownPresence
                    const p2 = sock.store?.presences?.[m.chat]?.[jid]?.lastKnownPresence
                    status = p1 || p2 || null
                } catch {}

                if (!status && global.onlineUsers?.has(jid)) status = 'available'

                const isOnline = ['available', 'composing', 'recording'].includes(status)

                const info = { jid, num, name, isAdmin, status }

                if (isOnline) online.push(info)
                else if (status) offline.push(info)
            }

            const unknown = participants.length - online.length - offline.length
            const mentions = online.map(u => u.jid)

            let text =
                `┏━━〔 *ONLINE MONITOR* 〕━━\n` +
                `┃\n` +
                `┃  ✦ Group  : ${meta.subject}\n` +
                `┃  ✦ Total  : ${participants.length}\n` +
                `┃  ◦ Online : ${online.length}\n` +
                `┃  ◦ Away   : ${offline.length}\n` +
                `┃  ◦ Hidden : ${unknown}\n` +
                `┃\n` +
                `┗━━━━━━━━━━━━━━━━━━━━━\n\n`

            if (online.length) {
                text += `*✦ ONLINE (${online.length})*\n`
                for (const u of online) {
                    const badge  = u.isAdmin ? '❏' : '◦'
                    const action = u.status === 'composing' ? ' ✍' : u.status === 'recording' ? ' 🎙' : ''
                    text += `${badge} @${u.num} — ${u.name}${action}\n`
                }
            } else {
                text += `*✦ ONLINE (0)*\n`
                text += `_No members detected online_\n`
                text += `_Note: WhatsApp only shares presence with your contacts_\n`
            }

            if (offline.length) {
                text += `\n*◦ RECENTLY AWAY (${offline.length})*\n`
                for (const u of offline.slice(0, 5)) {
                    text += `◦ ${u.name} — _${u.status}_\n`
                }
                if (offline.length > 5) text += `_...and ${offline.length - 5} more_\n`
            }

            await sock.sendMessage(m.chat, { text, mentions }, { quoted: m })

        } catch (err) {
            console.error('[LISTONLINE ERROR]', err.message)
            reply(`✘ Error: ${err.message}`)
        }
    }
                }
