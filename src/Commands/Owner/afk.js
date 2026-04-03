const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'database', 'afk.json')

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return { enabled: false, reason: '', since: null, until: null, notified: [] }
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch {
        return { enabled: false, reason: '', since: null, until: null, notified: [] }
    }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h`
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
}

function formatTime(ts) {
    const { getVar } = require('../../Plugin/configManager')
    const tz = getVar('TIMEZONE', 'Africa/Lagos')
    return new Date(ts).toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })
}

function formatUntil(ts) {
    const { getVar } = require('../../Plugin/configManager')
    const tz = getVar('TIMEZONE', 'Africa/Lagos')
    return new Date(ts).toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

function parseDuration(str) {
    if (!str) return 10 * 60 * 1000
    const match = str.match(/^(\d+)(s|m|h|d|w|y)$/i)
    if (!match) return null
    const val  = parseInt(match[1])
    const unit = match[2].toLowerCase()
    const map  = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        y: 365 * 24 * 60 * 60 * 1000,
    }
    return val * map[unit]
}

module.exports = {
    name: 'afk',
    alias: ['away'],
    desc: 'Set AFK / away message',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '💤', success: '💌' },

    execute: async (sock, m, { args, reply }) => {
        const db = loadDB()

        // .afk off
        if (args[0]?.toLowerCase() === 'off') {
            if (!db.enabled) return reply('_You are not AFK._')
            const duration = formatDuration(Date.now() - db.since)
            db.enabled  = false
            db.reason   = ''
            db.since    = null
            db.until    = null
            db.notified = []
            saveDB(db)
            return reply(`_*✓ AFK disabled*_\n_You were away for *${duration}*_`)
        }

        // Parse: .afk [duration] [reason]
        let duration = 10 * 60 * 1000
        let reason   = 'No reason given'
        let argsCopy = [...args]

        if (argsCopy.length > 0) {
            const parsed = parseDuration(argsCopy[0])
            if (parsed !== null) {
                duration = parsed
                argsCopy.shift()
            }
            if (argsCopy.length > 0) {
                reason = argsCopy.join(' ').trim()
            }
        }

        const now   = Date.now()
        const until = now + duration

        db.enabled  = true
        db.reason   = reason
        db.since    = now
        db.until    = until
        db.notified = []
        saveDB(db)

        reply(
            `💤 *AFK Enabled*\n\n` +
            `• Reason  : _${reason}_\n` +
            `• Since   : _${formatTime(now)}_\n` +
            `• Returns : _${formatUntil(until)} (${formatDuration(duration)})_\n\n` +
            `_Bot will notify people that you're away._\n` +
            `_Send any message or .afk off to return._`
        )
    }
}

// ── Called from message handler on every message ───────────────
module.exports.handleAFK = async function(sock, m) {
    try {
        // ── Ignore bot's own messages ──────────────────────────
        if (m.key?.fromMe) return

        const db = loadDB()
        if (!db.enabled) return

        const { getVar } = require('../../Plugin/configManager')

        // ── Skip bot commands ──────────────────────────────────
        const prefix = getVar('PREFIX', '.')
        const body   = (m.body || m.text || '').trim()
        if (body.startsWith(prefix)) return

        const ownerNumber = (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '')
        if (!ownerNumber) return

        const ownerJid   = `${ownerNumber}@s.whatsapp.net`
        const senderNorm = (m.sender || '').replace(/:\d+@/, '@s.whatsapp.net')
        const norm       = j => (j || '').replace(/:\d+@/, '@s.whatsapp.net').toLowerCase().trim()

        // ── Check if AFK timer expired ─────────────────────────
        if (db.until && Date.now() > db.until) {
            const duration = formatDuration(Date.now() - db.since)
            db.enabled  = false
            db.reason   = ''
            db.since    = null
            db.until    = null
            db.notified = []
            saveDB(db)
            await sock.sendMessage(ownerJid, {
                text: `_*✓ AFK auto-expired*_ ⏰\n_You were away for *${duration}*_`
            }).catch(() => {})
            return
        }

        // ── Auto-disable when owner sends a message ────────────
        if (norm(senderNorm) === norm(ownerJid)) {
            const duration = formatDuration(Date.now() - db.since)
            db.enabled  = false
            db.reason   = ''
            db.since    = null
            db.until    = null
            db.notified = []
            saveDB(db)
            await sock.sendMessage(m.chat, {
                text: `_*✓ Welcome back!*_ 👋\n_You were AFK for *${duration}*_`
            }, { quoted: m }).catch(() => {})
            return
        }

        // ── DM check ──────────────────────────────────────────
        const isDM = !m.isGroup

        // ── Tag/mention — serializer already extracts this ────
        const isMentioned = (m.mentionedJid || []).some(j => norm(j) === norm(ownerJid))

        // ── Quote — serializer sets m.quoted.sender ───────────
        const isQuoted = !!m.quoted?.sender && norm(m.quoted.sender) === norm(ownerJid)

        if (!isDM && !isMentioned && !isQuoted) return

        // ── Send AFK reply once per sender ────────────────────
        if (db.notified.includes(senderNorm)) return

        const elapsed   = formatDuration(Date.now() - db.since)
        const remaining = db.until ? formatDuration(db.until - Date.now()) : '?'

        await sock.sendMessage(m.chat, {
            text:
                `💤 *${ownerNumber} is currently AFK*\n\n` +
                `• Reason     : _${db.reason}_\n` +
                `• Away for   : _${elapsed}_\n` +
                `• Returns in : _~${remaining}_\n\n` +
                `_You will be notified when we return._`,
            mentions: [ownerJid]
        }, { quoted: m }).catch(() => {})

        db.notified.push(senderNorm)
        saveDB(db)

    } catch (err) {
        console.error('[AFK ERROR]', err.message)
    }
}


