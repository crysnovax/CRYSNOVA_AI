const axios = require('axios')

module.exports = {
    name: 'screenshot',
    alias: ['ss', 'webss', 'capture', 'ssweb'],
    category: 'WhatsApp',

    execute: async (sock, m, { reply, args }) => {

        try {

            let url = args[0]

            if (!url)
                return reply('⚉ Provide a URL\nExample: .ss https://google.com')

            if (!url.match(/^https?:\/\//))
                url = 'https://' + url

            try {
                new URL(url)
            } catch {
                return reply('✘ Invalid URL format')
            }

            reply('✦ _*Capturing screenshot...*_')

            // Screenshot APIs
            const screenshotApis = [

                async () => {
                    const api = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(url)}`

                    return await axios.get(api, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    })
                },

                async () => {
                    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`

                    const { data } = await axios.get(api, { timeout: 30000 })

                    if (data?.data?.screenshot?.url) {
                        return await axios.get(data.data.screenshot.url, {
                            responseType: 'arraybuffer',
                            timeout: 30000
                        })
                    }

                    throw new Error('Microlink failed')
                }
            ]

            // Try APIs sequentially
            for (const api of screenshotApis) {

                try {

                    const res = await api()

                    if (res?.data && res.data.length > 1000) {

                        await sock.sendMessage(m.chat, {
                            image: Buffer.from(res.data),
                     
                        }, { quoted: m })

                        return
                    }

                } catch {}
            }

            // ===== Fallback Preview =====
            try {

                const { data: html } = await axios.get(url, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                })

                const title =
                    html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ||
                    "No title"

                const desc =
                    html.match(/name=["']description["'][^>]*content=["'](.*?)["']/i)?.[1] ||
                    "No description"

                reply(`乂 *WEBSITE PREVIEW*\n\n☬ URL: ${url}\n⚉ Title: ${title}\n𓄄 Description: ${desc.substring(0, 180)}...`)

            } catch {
                reply('✘ _*Screenshot failed. Site may block bots.*_')
            }

        } catch (err) {
            console.log(err.message)
            reply('✘ Screenshot error')
        }
    }
}
