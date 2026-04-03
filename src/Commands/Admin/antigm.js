const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'database', 'antigm.json')

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {}
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch { return {} }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function isStatusMention(mek) {
    const raw = mek?.message || {}
    return !!raw.groupStatusMentionMessage
}

// ── Command ────────────────────────────────────────────────────
module.exports = {
    name: 'antigm',
    alias: ['antigroupmention', 'antigroupmsg', 'antieveryone'],
    desc: 'Prevent status mentions in group',
    category: 'Tools',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🛡️', success: '😤' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB()
        const group = m.chat
        if (!db[group]) db[group] = { enabled: false, action: 'warn' }

        const sub = args[0]?.toLowerCase()

        if (!sub) {
            const cfg = db[group]
            return reply(
                `ಠ_ಠ *Anti Status Mention Settings*\n\n` +
                `• Status : ${cfg.enabled ? '✓ ON' : '✘ OFF'}\n` +
                `• Action : ${cfg.action || 'warn'}\n\n` +
                `Commands:\n` +
                `• .antigm on\n• .antigm off\n` +
                `• .antigm warn → delete + warn\n` +
                `• .antigm kick → delete + kick`
            )
        }

        if (sub === 'on')   { db[group].enabled = true;  saveDB(db); return reply(`_*✓ Anti Status Mention*_ *ON*\nAction: *${db[group].action}*`) }
        if (sub === 'off')  { db[group].enabled = false; saveDB(db); return reply('_*✘ Anti Status Mention*_ *OFF*') }
        if (sub === 'warn') { db[group].action = 'warn'; saveDB(db); return reply('_*✓ Action*_ → *WARN*') }
        if (sub === 'kick') { db[group].action = 'kick'; saveDB(db); return reply('_*✓ Action*_ → *KICK*') }

        reply('Usage: .antigm on | off | warn | kick')
    }
}

// ── Message Handler ────────────────────────────────────────────
module.exports.handleAntiGM = async function(sock, m, mek) {
    try {
        if (!m.isGroup || m.key?.fromMe) return

        // Only fire on status mentions
        if (!isStatusMention(mek)) return

        const db    = loadDB()
        const group = m.chat
        if (!db[group]?.enabled) return

        const action = db[group].action || 'warn'

        // Admins are exempt
        const meta = await sock.groupMetadata(group).catch(() => null)
        if (!meta) return

        const admins     = meta.participants.filter(p => p.admin).map(p => p.id.replace(/:\d+@/, '@'))
        const senderNorm = (m.sender || '').replace(/:\d+@/, '@')
        if (admins.includes(senderNorm)) return

        const sender = m.sender

        await sock.sendMessage(group, { delete: m.key }).catch(() => {})

        if (action === 'warn') {
            await sock.sendMessage(group, {
                text: `ಥ⁠‿⁠ಥ @${sender.split('@')[0]} _*Status mentions are not allowed here!*_`,
                mentions: [sender]
            })
        }

        if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `ᄒ⁠ᴥ⁠ᄒ⁠ _*@${sender.split('@')[0]} was removed for status mentioning!*_`,
                mentions: [sender]
            })
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {})
        }

        console.log(`[ANTI GM] ${action} → ${sender.split('@')[0]} | status mention`)

    } catch (err) {
        console.error('[ANTI GM ERROR]', err.message)
    }
            }
