const axios = require('axios')

module.exports = {
    name: 'ss',
    alias: ['ssp','sstab','ssfull','ssmobile','ssweb'],
    category: 'utils',
    desc: 'Capture website screenshot',

    execute: async (sock, m, { args, reply }) => {
        try {

            const cmd = m.body.toLowerCase().split(/\s+/)[0].slice(1)

            let link = args[0] || (m.quoted && m.quoted.text)

            if (!link)
                return reply('*_✘ Add a link*_')

            const urlRegex = /(https?:\/\/[^\s]+)/g
            const foundLinks = link.match(urlRegex)
            const targetUrl = foundLinks ? foundLinks[0] : null

            if (!targetUrl)
                return reply('_*𓄄 Invalid url*_')

            await sock.sendMessage(m.chat,{
                react:{ text:"📸", key:m.key }
            })

            let device = "desktop"

            if (cmd === "ssp" || cmd === "ssmobile") device = "phone"
            if (cmd === "sstab") device = "tablet"
            if (cmd === "ssfull") device = "full"
            if (cmd === "ss") device = "desktop"

            const api = `https://api-rebix.zone.id/api/ssweb?url=${encodeURIComponent(targetUrl)}&device=${device}`

            const res = await axios.get(api,{ responseType:'arraybuffer' })

            const buffer = Buffer.from(res.data)

            await sock.sendMessage(
                m.chat,
                { image: buffer },
                { quoted: m }
            )

        } catch (err) {
            console.log(err.message)
            reply('*✘ ERROR: FAILED TO SCREENSHOT *')
        }
    }
}
