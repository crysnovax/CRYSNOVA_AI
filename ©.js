const axios  = require('axios')
const fs     = require('fs')
const path   = require('path')
const AdmZip = require('adm-zip')
const { getCodeHash } = require('./hash.js')

const API    = 'https://api.crysnovax.workers.dev'
const REPO   = 'crysnovax/CRYSNOVA_AI'
const BRANCH = 'main'

// Files/folders never touched during restore
const PROTECTED = [
    'sessions/',
    'session/',
    '.env',
    'database/',
    'auth_info_baileys/',
    'creds.json',
 //   'license.json',
    'node_modules/',
    'package-lock.json',
]

const isProtected = (filePath) =>
    PROTECTED.some(p => filePath.replace(/\\/g, '/').includes(p))

// ── Restore from GitHub (same pattern as update.js) ──────────────
async function restoreFromRepo() {
    console.log('\x1b[33m[©] Restoring bot files from GitHub...\x1b[0m')

    try {
        const zipUrl  = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`
        const res     = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 30000 })
        const buffer  = Buffer.from(res.data)
        const zip     = new AdmZip(buffer)
        const entries = zip.getEntries()

        for (const entry of entries) {
            if (entry.isDirectory) continue

            // Strip leading folder e.g. "CRYSNOVA_AI-main/"
            const relPath = entry.entryName.replace(/^[^/]+\//, '')
            if (!relPath) continue
            if (isProtected(relPath)) continue

            const destPath = path.join('./', relPath)
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            fs.writeFileSync(destPath, entry.getData())
        }

        console.log('\x1b[32m[©] Restore complete. Restarting...\x1b[0m')
        process.exit(0)   // Pterodactyl will auto-restart

    } catch (err) {
        console.error('\x1b[31m[©] Restore failed:\x1b[0m', err.message)
        // Still kill — can't run tampered code
        triggerKill()
    }
}

// ── Rainbow kill loop ─────────────────────────────────────────────
function triggerKill() {
    const colors = [
        '\x1b[31m',   // red
        '\x1b[33m',   // yellow
        '\x1b[32m',   // green
        '\x1b[36m',   // cyan
        '\x1b[34m',   // blue
        '\x1b[35m',   // magenta
        '\x1b[91m',   // bright red
        '\x1b[93m',   // bright yellow
        '\x1b[92m',   // bright green
        '\x1b[96m',   // bright cyan
        '\x1b[94m',   // bright blue
        '\x1b[95m',   // bright magenta
    ]

    const reset  = '\x1b[0m'
    const bold   = '\x1b[1m'
    const cols   = process.stdout.columns || 80
    const line   = '█'.repeat(cols)
    let   i      = 0

    while (true) {
        console.clear()
        // Fill roughly 40 lines to flood the whole terminal
        for (let row = 0; row < 40; row++) {
            const color = colors[(i + row) % colors.length]
            const half  = Math.floor((cols - 18) / 2)
            const pad   = ' '.repeat(Math.max(0, half))

            if (row % 4 === 0) {
                process.stdout.write(`${color}${bold}${line}${reset}\n`)
            } else {
                process.stdout.write(`${color}${bold}${pad}CRYSNOVA AI ERROR${pad}${reset}\n`)
            }
        }

        i = (i + 1) % colors.length
    }
}

// ── Register (first run) ──────────────────────────────────────────
async function registerIfNeeded() {
    if (fs.existsSync('./database/license.json')) return

    const hash = getCodeHash()
    const res  = await axios.post(`${API}/register`, { hash })

    fs.writeFileSync('./database/license.json', JSON.stringify({ key: res.data.key }))
    console.log('\x1b[32m[©] Registered successfully.\x1b[0m')
}

// ── Verify loop ───────────────────────────────────────────────────
async function verifyLoop() {
    const { key } = JSON.parse(fs.readFileSync('./database/license.json'))

    setInterval(async () => {
        try {
            const hash = getCodeHash()
            const res  = await axios.post(`${API}/verify`, { key, hash })

            if (!res.data.ok) {
                console.log('\x1b[31m[©] Integrity check failed. Restoring...\x1b[0m')
                await restoreFromRepo()
            }
        } catch {
            // Network blip — skip this tick, don't kill
        }
    }, 20000)
}

module.exports = { registerIfNeeded, verifyLoop }
