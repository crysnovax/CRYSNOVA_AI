const fs   = require('fs')
const path = require('path')
const cron = require('node-cron')

const SCHEDULE_FILE = path.join(process.cwd(), 'database', 'mute-schedules.json')

let schedules    = []
let activeCrons  = {}  // { id: cronJob }

try {
    if (fs.existsSync(SCHEDULE_FILE)) {
        schedules = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'))
    }
} catch {}

function saveSchedules() {
    try {
        fs.mkdirSync(path.dirname(SCHEDULE_FILE), { recursive: true })
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2))
    } catch {}
}

// ── FIX: sock must be passed at runtime, not at module load ──
// Call this once from ?.js after sock is ready
function setupMuteSchedules(sock) {
    // Destroy any old cron jobs first
    for (const job of Object.values(activeCrons)) {
        try { job.stop() } catch {}
    }
    activeCrons = {}

    const now    = Date.now()
    const active = schedules.filter(sch => !sch.once || new Date(sch.time) > now)

    for (const sch of active) {
        try {
            const job = cron.schedule(sch.cron, async () => {
                try {
                    if (sch.action === 'mute') {
                        await sock.groupSettingUpdate(sch.group, 'announcement')
                        await sock.sendMessage(sch.group, { text: '🔇 _Group auto-muted (scheduled)_' })
                    } else {
                        await sock.groupSettingUpdate(sch.group, 'not_announcement')
                        await sock.sendMessage(sch.group, { text: '🔊 _Group auto-unmuted (scheduled)_' })
                    }

                    if (sch.once) {
                        schedules = schedules.filter(s => s.id !== sch.id)
                        saveSchedules()
                        if (activeCrons[sch.id]) {
                            activeCrons[sch.id].stop()
                            delete activeCrons[sch.id]
                        }
                    }
                } catch (e) {
                    console.error('[SCHED MUTE]', e.message)
                }
            })

            activeCrons[sch.id] = job
        } catch (e) {
            console.error('[CRON SETUP ERROR]', sch.id, e.message)
        }
    }

    if (active.length) {
        console.log(`[MUTE] Restored ${active.length} schedule(s)`)
    }
}

// ── Time helpers ─────────────────────────────────────────────
function timeToCron(timeStr) {
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i)
    if (!match) return null

    let hour      = parseInt(match[1])
    const min     = match[2] ? parseInt(match[2]) : 0
    const period  = match[3]?.toLowerCase()

    if (period === 'pm' && hour < 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    if (hour < 0 || hour > 23 || min < 0 || min > 59) return null

    return `${min} ${hour} * * *`
}

const parseTime = str => {
    const match = str?.match(/^(\d+)(s|m|h|d|w)$/i)
    if (!match) return null
    const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }
    return parseInt(match[1]) * map[match[2].toLowerCase()]
}

// ── Command ───────────────────────────────────────────────────
module.exports = {
    name: 'mute',
    alias: ['unmute'],
    desc: 'Mute/unmute group instantly or on schedule',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    reactions: { start: '🔇', success: '✦' },

    execute: async (sock, m, { args, reply }) => {

        const groupJid = m.chat
        const cmd      = (m.text || '').trim().split(/\s+/)[0].replace(/^\./, '').toLowerCase()
        const sub      = args[0]?.toLowerCase()

        // ── UNMUTE ────────────────────────────────────────────
        if (cmd === 'unmute') {
            if (global.muteTimers?.[groupJid]) {
                clearTimeout(global.muteTimers[groupJid])
                delete global.muteTimers[groupJid]
            }
            await sock.groupSettingUpdate(groupJid, 'not_announcement')
            return reply('🔊 Group unmuted — everyone can chat now')
        }

        // ── CANCEL SCHEDULE ───────────────────────────────────
        if (sub === 'cancel') {
            const removed = schedules.filter(s => s.group === groupJid)
            schedules     = schedules.filter(s => s.group !== groupJid)
            saveSchedules()

            for (const s of removed) {
                if (activeCrons[s.id]) {
                    activeCrons[s.id].stop()
                    delete activeCrons[s.id]
                }
            }

            return reply(`✦ ${removed.length} schedule(s) cancelled for this group`)
        }

        // ── MUTE FOR <time> ───────────────────────────────────
        if (sub === 'for') {
            const timeArg = args[1]
            const ms      = parseTime(timeArg)

            if (!ms) return reply('⚉ Use: `.mute for 10m | 2h | 1d | 2w`')
            if (ms > 60 * 24 * 60 * 60 * 1000) return reply('⚉ Maximum is 60 days')

            await sock.groupSettingUpdate(groupJid, 'announcement')
            reply(`🔇 Group muted for ${timeArg}`)

            if (global.muteTimers?.[groupJid]) clearTimeout(global.muteTimers[groupJid])
            global.muteTimers = global.muteTimers || {}
            global.muteTimers[groupJid] = setTimeout(async () => {
                await sock.groupSettingUpdate(groupJid, 'not_announcement').catch(() => {})
                await sock.sendMessage(groupJid, { text: '🔊 _Group auto-unmuted_' }).catch(() => {})
                delete global.muteTimers[groupJid]
            }, ms)

            return
        }

        // ── MUTE FROM <time> TO <time> ────────────────────────
        if (sub === 'from') {
            const startTime = args[1]
            const toWord    = args[2]
            const endTime   = args[3]
            const repeat    = args[4]?.toLowerCase() || 'daily'

            if (!startTime || !endTime || toWord !== 'to') {
                return reply('⚉ Use: `.mute from 12pm to 5am daily` or `once`')
            }

            const startCron = timeToCron(startTime)
            const endCron   = timeToCron(endTime)

            if (!startCron || !endCron) {
                return reply('⚉ Invalid time. Use: 12pm, 5am, 17:00 etc.')
            }

            const baseId  = `${groupJid}-${Date.now()}`
            const isOnce  = repeat !== 'daily'

            const startSch = { id: baseId + '-start', group: groupJid, cron: startCron, action: 'mute',   once: isOnce, time: startTime }
            const endSch   = { id: baseId + '-end',   group: groupJid, cron: endCron,   action: 'unmute', once: isOnce, time: endTime   }

            schedules.push(startSch, endSch)
            saveSchedules()

            // Register the cron jobs immediately with current sock
            for (const sch of [startSch, endSch]) {
                const job = cron.schedule(sch.cron, async () => {
                    try {
                        if (sch.action === 'mute') {
                            await sock.groupSettingUpdate(sch.group, 'announcement')
                            await sock.sendMessage(sch.group, { text: '🔇 _Group auto-muted_' })
                        } else {
                            await sock.groupSettingUpdate(sch.group, 'not_announcement')
                            await sock.sendMessage(sch.group, { text: '🔊 _Group auto-unmuted_' })
                        }
                        if (sch.once) {
                            schedules = schedules.filter(s => s.id !== sch.id)
                            saveSchedules()
                            activeCrons[sch.id]?.stop()
                            delete activeCrons[sch.id]
                        }
                    } catch (e) {
                        console.error('[SCHED MUTE]', e.message)
                    }
                })
                activeCrons[sch.id] = job
            }

            return reply(
                `🕒 *Mute Schedule Set*\n\n` +
                `✦ Mute at   : ${startTime}\n` +
                `✦ Unmute at : ${endTime}\n` +
                `✦ Repeat    : ${repeat}\n\n` +
                `Use .mute cancel to remove`
            )
        }

        // ── SHOW SCHEDULES ────────────────────────────────────
        if (sub === 'schedules' || sub === 'list') {
            const mine = schedules.filter(s => s.group === groupJid)
            if (!mine.length) return reply('✘ No active schedules for this group')
            const text = mine.map(s => `✦ ${s.action.toUpperCase()} at ${s.time} (${s.once ? 'once' : 'daily'})`).join('\n')
            return reply(`🕒 *Active Schedules:*\n\n${text}`)
        }

        // ── INSTANT MUTE ──────────────────────────────────────
        await sock.groupSettingUpdate(groupJid, 'announcement')
        return reply('🔇 Group muted — only admins can send messages')
    },

    // Expose setup so ?.js can call it at boot
    setupMuteSchedules
        }
                
