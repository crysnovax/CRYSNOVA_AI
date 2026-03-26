// ╔══════════════════════════════════════════════════╗
// ║        X.js — CRYSNOVA AI PREMIUM PLUGIN         ║
// ║   AI-Powered Command Creator + Image Fetcher     ║
// ╚══════════════════════════════════════════════════╝

const fs   = require('fs')
const path = require('path')
const { getLunaResponse } = require('../Core/!!!.js')
const { getAll }          = require('../../Plugin/crysCmd.js')

// ── Registry force-register (bypasses duplicate guard) ────────
const forceRegister = (cmd) => {
    const registry = getAll()
    const name = cmd.name.toLowerCase()
    registry.set(name, cmd)
    if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) registry.set(a.toLowerCase(), cmd)
    }
}

// ── Hot-load a JS file and register it instantly ──────────────
const hotLoad = (filePath, category = 'Generated') => {
    delete require.cache[require.resolve(filePath)]
    const cmd = require(filePath)
    if (!cmd?.name || !cmd?.execute) throw new Error('Invalid plugin — missing name or execute')
    cmd.category = category
    forceRegister(cmd)
    return cmd.name
}

// ── AI System Prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior WhatsApp bot developer building plugins for CRYSNOVA AI BOT.
The bot uses @itsliaaa/baileys library. Output ONLY raw JavaScript code. No markdown. No backticks. No explanation. No comments about structure.

Plugin format MUST be exactly:
module.exports = {
    name: 'commandname',
    alias: ['alias1'],
    desc: 'Short description',
    category: 'Tools',
    execute: async (sock, m, { args, text, reply, prefix, isOwner, isSudo, isAdmin, isGroup, groupMeta }) => {
        // your code here
    }
};

STRICT RULES:
1. Use built-in fetch() for all HTTP requests — no axios, no node-fetch
2. Use reply(text) to respond — never sock.sendMessage directly unless sending media
3. Always wrap in try/catch with proper error messages
4. Make the code production-ready, clean, and fully working
5. Handle edge cases (no input, API errors, empty results)
6. For media: await sock.sendMessage(m.chat, { image: buffer, caption: text }, { quoted: m })
7. Available: fs, path, Buffer — no other external packages
8. The command name must exactly match what is requested
9. Output ONLY the JS module code — nothing before, nothing after`

// ═════════════════════════════════════════════════════════════
// .xm command|commandname|description of what it should do
// ═════════════════════════════════════════════════════════════
module.exports = {
    name: 'xm',
    alias: ['xcreate', 'aicommand'],
    desc: 'AI generates and hot-installs a new command instantly',
    category: 'Owner',
    sudoOnly: true,

    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(
            `✦ *X.js — AI Command Creator*\n\n` +
            `*Usage:*\n.xm command|<name>|<description>\n\n` +
            `*Examples:*\n` +
            `• _.xm command|quote|fetch a random inspirational quote from quotable.io API_\n` +
            `• _.xm command|weather|get current weather for any city using wttr.in_\n` +
            `• _.xm command|joke|fetch a random programming joke_\n\n` +
            `_The AI builds and installs it instantly. No restart needed._`
        )

        const parts = text.split('|').map(p => p.trim())

        if (parts.length < 3 || parts[0].toLowerCase() !== 'command') {
            return reply(
                `⚉ Wrong format\n\n` +
                `*Correct:* .xm command|<name>|<what it does>\n` +
                `*Example:* .xm command|meme|fetch a random meme from meme-api`
            )
        }

        const cmdName = parts[1].toLowerCase().replace(/[^a-z0-9]/g, '')
        const description = parts.slice(2).join('|')

        if (!cmdName) return reply('✘ Command name is invalid')
        if (!description) return reply('𓄄 Please describe what the command should do')

        // Show coding status
        const statusMsg = await sock.sendMessage(m.chat, {
            text: `_*✦ CODING...*_`
        }, { quoted: m })

        try {
            const prompt = `Build a WhatsApp bot command named "${cmdName}".\n\nWhat it must do: ${description}\n\nCommand name: ${cmdName}\nMake it production-ready, fully functional, with proper error handling.`

            const rawCode = await getLunaResponse(SYSTEM_PROMPT + '\n\n' + prompt)

            if (!rawCode || rawCode.length < 80) throw new Error('AI returned insufficient code')

            // Strip any markdown the AI might have wrapped
            const cleanCode = rawCode
                .replace(/^```(?:javascript|js)?\n?/im, '')
                .replace(/\n?```\s*$/im, '')
                .trim()

            // Basic validation
            if (!cleanCode.includes('module.exports')) throw new Error('AI did not produce a valid plugin module')
            if (!cleanCode.includes('execute')) throw new Error('Plugin is missing execute function')

            // Save to Generated folder
            const genDir = path.join(process.cwd(), 'src', 'Commands', 'Generated')
            if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true })

            const filePath = path.join(genDir, `${cmdName}.js`)
            fs.writeFileSync(filePath, cleanCode, 'utf8')

            // Hot-load without restart
            const loadedName = hotLoad(filePath)

            // Delete status message
            if (statusMsg?.key) {
                await sock.sendMessage(m.chat, { delete: statusMsg.key }).catch(() => {})
            }

            await sock.sendMessage(m.chat, {
                text:
                    `\`SUCCESS!\`\n\n` +
                    `✦ *\.${loadedName}* is now live\n` +
                    `_Use it right now — no reload needed_`
            }, { quoted: m })

        } catch (err) {
            // Clean up bad file
            try {
                const filePath = path.join(process.cwd(), 'src', 'Commands', 'Generated', `${cmdName}.js`)
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
            } catch {}

            if (statusMsg?.key) {
                await sock.sendMessage(m.chat, { delete: statusMsg.key }).catch(() => {})
            }

            await sock.sendMessage(m.chat, {
                text: `_*✦ CODING FAILED*_\n\n_${err.message}_`
            }, { quoted: m })
        }
    }
}

// ═════════════════════════════════════════════════════════════
// .fetchimage <query> — search and send images from the web
// ═════════════════════════════════════════════════════════════
const fetchImageCmd = {
    name: 'fetchimage',
    alias: ['fi', 'imgfetch', 'searchimage'],
    desc: 'Search and fetch images from the web',
    category: 'Search',

    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(
            `🖼️ *Fetch Image*\n\nUsage: _.fetchimage <query>_\nExample: _.fetchimage sunset beach_`
        )

        await sock.sendMessage(m.chat, {
            react: { text: '🔍', key: m.key }
        }).catch(() => {})

        try {
            const query = encodeURIComponent(text.trim())

            // DuckDuckGo image search
            const vqdRes = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html'
                }
            })
            const html = await vqdRes.text()
            const vqdMatch = html.match(/vqd=([0-9-]+)/)
            if (!vqdMatch) throw new Error('Could not initialize image search')

            const vqd = vqdMatch[1]
            const searchRes = await fetch(
                `https://duckduckgo.com/i.js?q=${query}&o=json&p=1&s=0&u=bing&f=,,,&l=us-en&vqd=${vqd}`,
                {
                    headers: {
                        'Referer': 'https://duckduckgo.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                }
            )

            if (!searchRes.ok) throw new Error('Image search request failed')

            const data = await searchRes.json()
            const results = (data?.results || []).filter(r => r?.image)

            if (!results.length) return reply(`𓉤 No images found for: *${text}*`)

            // Pick from top 5 randomly for variety
            const pick = results[Math.floor(Math.random() * Math.min(5, results.length))]
            const imageUrl = pick.image

            // Download the image
            const imgRes = await fetch(imageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })
            if (!imgRes.ok) throw new Error('Failed to download image')

            const buffer = Buffer.from(await imgRes.arrayBuffer())
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'

            await sock.sendMessage(m.chat, {
                image: buffer,
                mimetype: mimeType,
                caption: `🖼️ *${text}*\n_Source: ${pick.source || 'Web'}_`
            }, { quoted: m })

        } catch (err) {
            reply(`✘ Image fetch failed\n_${err.message}_`)
        }
    }
}

// ═════════════════════════════════════════════════════════════
// .fetchweb <query> — fetch and summarize web content via AI
// ═════════════════════════════════════════════════════════════
const fetchWebCmd = {
    name: 'fetchweb',
    alias: ['fw', 'websearch', 'search'],
    desc: 'Search the web and get an AI-summarized answer',
    category: 'Search',

    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply(
            `🌐 *Fetch Web*\n\nUsage: _.fetchweb <query>_\nExample: _.fetchweb latest news on AI_`
        )

        await sock.sendMessage(m.chat, {
            react: { text: '🌐', key: m.key }
        }).catch(() => {})

        const statusMsg = await sock.sendMessage(m.chat, {
            text: `_*✦ SEARCHING...*_`
        }, { quoted: m })

        try {
            const query = encodeURIComponent(text.trim())

            // DuckDuckGo instant answer API
            const res = await fetch(
                `https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
                { headers: { 'User-Agent': 'Mozilla/5.0' } }
            )

            const data = await res.json()

            let context = ''

            if (data?.AbstractText) {
                context += data.AbstractText + '\n'
            }

            if (data?.RelatedTopics?.length) {
                const topics = data.RelatedTopics
                    .slice(0, 5)
                    .filter(t => t?.Text)
                    .map(t => t.Text)
                    .join('\n')
                context += topics
            }

            if (!context.trim()) {
                context = `The user searched for: "${text}". Provide a helpful, accurate, concise answer based on your knowledge.`
            }

            // Use AI to summarize
            const aiPrompt = `Based on this web search for "${text}", provide a clear and helpful answer:\n\n${context}`
            const answer = await getLunaResponse(aiPrompt)

            if (statusMsg?.key) {
                await sock.sendMessage(m.chat, { delete: statusMsg.key }).catch(() => {})
            }

            await sock.sendMessage(m.chat, {
                text:
                    `🌐 *${text}*\n\n` +
                    `${answer}\n\n` +
                    `_Powered by CRYSNOVA AI_`
            }, { quoted: m })

        } catch (err) {
            if (statusMsg?.key) {
                await sock.sendMessage(m.chat, { delete: statusMsg.key }).catch(() => {})
            }
            reply(`✘ Search failed\n_${err.message}_`)
        }
    }
}

// Register all sub-commands on load
;(function registerAll() {
    try { forceRegister(fetchImageCmd) } catch {}
    try { forceRegister(fetchWebCmd)   } catch {}
})()
