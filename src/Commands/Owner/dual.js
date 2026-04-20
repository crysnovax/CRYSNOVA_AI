// ZEE BOT V2 - Dual Management
const fs   = require('fs')
const path = require('path')
const { getVar, setVar } = require('../../Plugin/configManager')

const ENV_PATH = path.join(process.cwd(), '.env')

// Clean number: remove +, spaces, and keep only digits
const cleanNumber = (num) => num.replace(/[^0-9]/g, '').trim()

// Saves to runtime + process.env + .env file
const saveDual = (value) => {
    const cleaned = value.split(',')
        .map(cleanNumber)
        .filter(Boolean)
        .join(',')

    setVar('DUAL_NUMBERS', cleaned)
    process.env.DUAL_NUMBERS = cleaned

    try {
        if (!fs.existsSync(ENV_PATH)) {
            fs.writeFileSync(ENV_PATH, `DUAL_NUMBERS=${cleaned}\n`)
            return
        }

        const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
        let found = false

        const updated = lines.map(line => {
            if (line.trim().startsWith('DUAL_NUMBERS=')) {
                found = true
                return `DUAL_NUMBERS=${cleaned}`
            }
            return line
        })

        if (!found) updated.push(`DUAL_NUMBERS=${cleaned}`)
        fs.writeFileSync(ENV_PATH, updated.join('\n'))

    } catch (e) {
        console.error('[DUAL] .env write failed:', e.message)
    }
}

// Read clean list
const getList = () => {
    const fromEnv     = process.env.DUAL_NUMBERS || ''
    const fromRuntime = String(getVar('DUAL_NUMBERS') || '')

    const combined = [fromEnv, fromRuntime]
        .join(',')
        .split(',')
        .map(cleanNumber)
        .filter(Boolean)

    return [...new Set(combined)]
}

module.exports = {
    name: 'dual',
    alias: ['adddual', 'deldual', 'duallist'],
    desc: 'Manage dual users (full owner-level access)',
    category: 'Owner',
    ownerOnly: true,
    reactions: { start: '👑', success: '🌟' },

    execute: async (sock, m, { args, reply }) => {
        const sub  = args[0]?.toLowerCase()
        const list = getList()

        // .dual list
        if (!sub || sub === 'list') {
            if (!list.length) {
                return reply('📋 No dual users set.\n\nUse:\n• .dual add <number>\n• .dual del <number>')
            }

            const formatted = list
                .map((n, i) => `_*❏⋆⁩${i + 1}. +${n}*_`)
                .join('\n')

            return reply(`亗 *Dual Users:*❏⋆⁩⁩◈\n${formatted}\n\n_These users have full owner-level access_`)
        }

        // .dual add <number>
        if (sub === 'add') {
            let num = (args[1] || '').trim()
            if (!num) return reply('Usage: .dual add <number>\nExample: .dual add 2347043550282')

            num = cleanNumber(num)
            if (!num) return reply('Please enter a valid phone number (digits only)')

            if (list.includes(num)) {
                return reply(`_*𓉤 ❏⋆◈ ⁩⁩${num} is already a dual user*_`)
            }

            list.push(num)
            saveDual(list.join(','))

            return reply(`_*☬ Added ❏⋆◈+${num} to dual users*_\n_Works immediately - saved to .env_`)
        }

        // .dual del / remove
        if (sub === 'del' || sub === 'remove') {
            let num = (args[1] || '').trim()
            if (!num) return reply('Usage: .dual del <number>\nExample: .dual del 2347043550282')

            num = cleanNumber(num)
            if (!num) return reply('Please enter a valid phone number')

            const updated = list.filter(n => n !== num)

            if (updated.length === list.length) {
                return reply(`_*𓉤 ❏⋆⁩⁩${num} is not a dual user*_`)
            }

            saveDual(updated.join(','))
            return reply(`🗑️ Removed ❏⋆⁩⁩◈*+${num}* from dual users`)
        }

        // .dual clear
        if (sub === 'clear') {
            saveDual('')
            return reply('_*✦ All dual users cleared*_')
        }

        // Help
        return reply('📋 *Dual Commands:*\n• .dual list\n• .dual add <number>\n• .dual del <number>\n• .dual clear')
    }
}

