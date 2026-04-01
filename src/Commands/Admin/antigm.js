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

// Get all mentions from every possible location
function getMentions(m) {
    const raw = m.message || {}

    const ext = raw.extendedTextMessage
    if (ext?.contextInfo?.mentionedJid?.length) return ext.contextInfo.mentionedJid

    for (const type of ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage']) {
        if (raw[type]?.contextInfo?.mentionedJid?.length) return raw[type].contextInfo.mentionedJid
    }

    if (Array.isArray(m.mentionedJid) && m.mentionedJid.length) return m.mentionedJid
    if (m.msg?.contextInfo?.mentionedJid?.length) return m.msg.contextInfo.mentionedJid

    return []
}

// ── Command ────────────────────────────────────────────────────
module.exports = {
    name: 'antigm',
    alias: ['antigroupmention', 'antigroupmsg', 'antieveryone'],
    desc: 'Prevent group mentions in group',
    category: 'Tools',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🛡️', success: '😤' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB()
        const group = m.chat
        if (!db[group]) db[group] = { enabled: false, action: 'warn', minMentions: 1 }

        const sub = args[0]?.toLowerCase()

        if (!sub) {
            const cfg = db[group]
            return reply(
                `ಠ_ಠ *Anti Group Mention Settings*\n\n` +
                `• Status      : ${cfg.enabled ? '✓ ON' : '✘ OFF'}\n` +
                `• Action      : ${cfg.action || 'warn'}\n` +
                `• Min mentions: ${cfg.minMentions || 2} to trigger\n\n` +
                `Commands:\n` +
                `• .antigm on\n• .antigm off\n` +
                `• .antigm warn  → delete + warn\n` +
                `• .antigm kick  → delete + kick\n` +
                `• .antigm min 3 → set minimum`
            )
        }

        if (sub === 'on')  { db[group].enabled = true;  saveDB(db); return reply(`_*✓ Anti Group Mention*_ *ON*\nAction: *${db[group].action}*\nMin: *${db[group].minMentions}*`) }
        if (sub === 'off') { db[group].enabled = false; saveDB(db); return reply('_*✘ Anti Group Mention*$ *OFF*') }
        if (sub === 'warn') { db[group].action = 'warn'; saveDB(db); return reply('_*✓ Action*_ → *WARN*') }
        if (sub === 'kick') { db[group].action = 'kick'; saveDB(db); return reply('_*✓ Action*_ → *KICK*') }
        if (sub === 'min' && args[1]) {
            const num = parseInt(args[1])
            if (isNaN(num) || num < 1) return reply('✘ Must be a number greater than 0')
            db[group].minMentions = num
            saveDB(db)
            return reply(`✓ Min mentions → *${num}*`)
        }

        reply('Usage: .antigm on | off | warn | kick | min <number>')
    }
}

// ── Message Handler ────────────────────────────────────────────
module.exports.handleAntiGM = async function(sock, m) {
    try {
        if (!m.isGroup || m.key?.fromMe) return

        const db    = loadDB()
        const group = m.chat
        if (!db[group]?.enabled) return

        const minMentions = db[group].minMentions || 2
        const action      = db[group].action || 'warn'

        // Use mentionedJid — this is what WhatsApp actually populates
        const mentions = getMentions(m)

        console.log(`[ANTI GM DEBUG] mentions: ${mentions.length} | min: ${minMentions} | sender: ${m.sender?.split('@')[0]}`)

        if (mentions.length < minMentions) return

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
                text: `ಥ⁠‿⁠ಥ @${sender.split('@')[0]} _*Group mentions are not allowed here!*_`,
                mentions: [sender]
            })
        }

        if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `ᄒ⁠ᴥ⁠ᄒ⁠ _*@${sender.split('@')[0]} was removed for group mentioning!*_`,
                mentions: [sender]
            })
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {})
        }

        console.log(`[ANTI GM] ${action} → ${sender.split('@')[0]} | mentions: ${mentions.length}`)

    } catch (err) {
        console.error('[ANTI GM ERROR]', err.message)
    }
}

