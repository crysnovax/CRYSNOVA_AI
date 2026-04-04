const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'database', 'antiword.json')

function loadDB() {
    if (!fs.existsSync(DB_PATH)) return {}
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch { return {} }
}

function saveDB(data) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function containsBannedWord(text, bannedWords) {
    const lowerText = text.toLowerCase()
    return bannedWords.some(word => lowerText.includes(word.toLowerCase()))
}

function extractText(m) {
    if (m.text) return m.text
    if (m.body) return m.body
    const msg = m.message || m.msg || {}
    if (msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
    if (msg.imageMessage?.caption) return msg.imageMessage.caption
    if (msg.videoMessage?.caption) return msg.videoMessage.caption
    if (msg.documentMessage?.caption) return msg.documentMessage.caption
    if (m.quoted?.text) return m.quoted.text
    return ''
}

module.exports = {
    name: 'antiword',
    alias: ['banword', 'wordban'],
    desc: 'Delete messages containing banned words',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🛡️', success: '🗑️' },

    execute: async (sock, m, { args, reply }) => {
        const db    = loadDB()
        const group = m.chat
        if (!db[group]) db[group] = { enabled: false, words: [], action: 'warn' }

        const sub = args[0]?.toLowerCase()

        if (!sub) {
            const cfg = db[group]
            const wordList = cfg.words.length 
                ? cfg.words.map(w => `❏ ${w}`).join('\n')
                : '❏ none'
            return reply(
                `⚠︎ *Anti‑Word Settings*\n\n` +
                `• Status : ${cfg.enabled ? '✓ ON' : '✘ OFF'}\n` +
                `• Action : ${cfg.action === 'warn' ? '⚠︎ WARN' : 'ⓘ KICK'}\n` +
                `• Words  :\n${wordList}\n\n` +
                `Commands:\n` +
                `• .antiword on / off\n` +
                `• .antiword add <word1> <word2> ...\n` +
                `• .antiword remove <word>\n` +
                `• .antiword list\n` +
                `• .antiword warn / kick`
            )
        }

        if (sub === 'on') {
            db[group].enabled = true
            saveDB(db)
            return reply(`✓ Anti‑Word *ON* 亗\nAction: ${db[group].action === 'warn' ? '⚠︎ WARN' : 'ⓘ KICK'}`)
        }
        if (sub === 'off') {
            db[group].enabled = false
            saveDB(db)
            return reply(`✘ Anti‑Word *OFF*`)
        }
        if (sub === 'warn') {
            db[group].action = 'warn'
            saveDB(db)
            return reply(`⚠︎ Action → *WARN*`)
        }
        if (sub === 'kick') {
            db[group].action = 'kick'
            saveDB(db)
            return reply(`ⓘ Action → *KICK*`)
        }

        if (sub === 'add') {
            const words = args.slice(1).filter(w => w && w.trim())
            if (!words.length) return reply(`✐ Usage: .antiword add <word1> <word2> ...`)
            
            const newWords = []
            for (const w of words) {
                const word = w.toLowerCase()
                if (!db[group].words.includes(word)) {
                    db[group].words.push(word)
                    newWords.push(word)
                }
            }
            saveDB(db)
            if (newWords.length) {
                return reply(`✓ Added:\n${newWords.map(w => `❏ ${w}`).join('\n')}`)
            } else {
                return reply(`✘ All words already banned.`)
            }
        }

        if (sub === 'remove') {
            const word = args[1]?.toLowerCase()
            if (!word) return reply(`✐ Usage: .antiword remove <word>`)
            const idx = db[group].words.indexOf(word)
            if (idx === -1) return reply(`✘ "${word}" not found.`)
            db[group].words.splice(idx, 1)
            saveDB(db)
            return reply(`🗑️ Removed: ❏ ${word}`)
        }

        if (sub === 'list') {
            const words = db[group].words
            if (!words.length) return reply(`❏ No banned words in this group.`)
            let text = `𓃼 *Banned words:*\n`
            text += words.map((w, i) => `❏ ${w}`).join('\n')
            return reply(text)
        }

        return reply(`𒆜 Usage:\n.antiword on/off\n.antiword add <words>\n.antiword remove <word>\n.antiword list\n.antiword warn/kick`)
    }
}

// ── Message Handler (fixed tagging like antitag) ─────────────────────────
module.exports.handleAntiWord = async function(sock, m, mek) {
    try {
        if (!m.isGroup) return
        if (m.key?.fromMe) return

        const db = loadDB()
        const group = m.chat
        const cfg = db[group]
        if (!cfg?.enabled) return
        if (!cfg.words?.length) return

        const text = extractText(m)
        if (!text) return
        if (!containsBannedWord(text, cfg.words)) return

        const meta = await sock.groupMetadata(group).catch(() => null)
        if (!meta) return

        const sender = m.sender  // Keep original JID from message
        const admins = meta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id.replace(/:\d+@/, '@'))
        const senderNorm = (sender || '').replace(/:\d+@/, '@')
        if (admins.includes(senderNorm)) return

        const action = cfg.action || 'warn'

        // Delete the message
        await sock.sendMessage(group, { delete: m.key }).catch(() => {})

        if (action === 'warn') {
            await sock.sendMessage(group, {
                text: `⚠︎ @${sender.split('@')[0]} *banned word detected!* \nYour message was deleted. ಥ⁠‿⁠ಥ`,
                mentions: [sender]  // Full JID
            }).catch(() => {})
        } else if (action === 'kick') {
            await sock.sendMessage(group, {
                text: `ⓘ @${sender.split('@')[0]} *was removed* for using a banned word. ಠ_ಠ`,
                mentions: [sender]
            }).catch(() => {})
            await sock.groupParticipantsUpdate(group, [sender], 'remove').catch(() => {})
        }
    } catch (err) {
        console.error('[ANTIWORD ERROR]', err.message)
    }
}