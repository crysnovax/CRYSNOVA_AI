const axios = require('axios')

module.exports = {
    name: 'anime',
    alias: ['weeb', 'waifu'],
    category: 'WhatsApp',
    
    execute: async (sock, m, { reply, args, command }) => {
        
        const action = args[0]?.toLowerCase() || 'waifu'
        
        const endpoints = {
            waifu: 'https://api.waifu.pics/sfw/waifu',
            neko: 'https://api.waifu.pics/sfw/neko',
            shinobu: 'https://api.waifu.pics/sfw/shinobu',
            megumin: 'https://api.waifu.pics/sfw/megumin',
            bully: 'https://api.waifu.pics/sfw/bully',
            cuddle: 'https://api.waifu.pics/sfw/cuddle',
            cry: 'https://api.waifu.pics/sfw/cry',
            hug: 'https://api.waifu.pics/sfw/hug',
            awoo: 'https://api.waifu.pics/sfw/awoo',
            kiss: 'https://api.waifu.pics/sfw/kiss',
            lick: 'https://api.waifu.pics/sfw/lick',
            pat: 'https://api.waifu.pics/sfw/pat',
            smug: 'https://api.waifu.pics/sfw/smug',
            bonk: 'https://api.waifu.pics/sfw/bonk',
            yeet: 'https://api.waifu.pics/sfw/yeet',
            blush: 'https://api.waifu.pics/sfw/blush',
            smile: 'https://api.waifu.pics/sfw/smile',
            wave: 'https://api.waifu.pics/sfw/wave',
            highfive: 'https://api.waifu.pics/sfw/highfive',
            handhold: 'https://api.waifu.pics/sfw/handhold',
            nom: 'https://api.waifu.pics/sfw/nom',
            bite: 'https://api.waifu.pics/sfw/bite',
            glomp: 'https://api.waifu.pics/sfw/glomp',
            slap: 'https://api.waifu.pics/sfw/slap',
            kill: 'https://api.waifu.pics/sfw/kill',
            kick: 'https://api.waifu.pics/sfw/kick',
            happy: 'https://api.waifu.pics/sfw/happy',
            wink: 'https://api.waifu.pics/sfw/wink',
            poke: 'https://api.waifu.pics/sfw/poke',
            dance: 'https://api.waifu.pics/sfw/dance',
            cringe: 'https://api.waifu.pics/sfw/cringe'
        }
        
        if (action === 'list') {
            return reply(`乂 *ANIME REACTIONS* 乂

☬ SFW: ${Object.keys(endpoints).join(', ')}
⚉ NSFW: waifu, neko, trap, blowjob (use .anime nsfw <type>)`)
        }
        
        if (action === 'nsfw') {
            const nsfwType = args[1] || 'waifu'
            const validNsfw = ['waifu', 'neko', 'trap', 'blowjob']
            
            if (!validNsfw.includes(nsfwType))
                return reply('⚉ Valid NSFW: waifu, neko, trap, blowjob')
            
            try {
                const { data } = await axios.get(`https://api.waifu.pics/nsfw/${nsfwType}`)
                await sock.sendMessage(m.chat, {
                    image: { url: data.url },
                    caption: `亗 NSFW ${nsfwType}`
                }, { quoted: m })
            } catch (e) {
                reply('✘ Failed to fetch')
            }
            return
        }
        
        if (action === 'quote') {
            try {
                const { data } = await axios.get('https://animechan.xyz/api/random')
                reply(`乂 *ANIME QUOTE* 乂

☬ "${data.quote}"
⚉ — ${data.character} (${data.anime})`)
            } catch (e) {
                reply('✘ Failed to fetch quote')
            }
            return
        }
        
        if (action === 'character') {
            const name = args.slice(1).join(' ')
            if (!name) return reply('⚉ Provide character name\nExample: .anime character Naruto')
            
            try {
                const { data } = await axios.get(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`)
                if (!data.data.length) return reply('✘ Character not found')
                
                const char = data.data[0]
                reply(`乂 *CHARACTER INFO* 乂

☬ Name: ${char.name}
⚉ Nickname: ${char.nicknames.join(', ') || 'None'}
𓄄 Favorites: ${char.favorites.toLocaleString()}
亗 About: ${char.about?.substring(0, 500) || 'No info'}...

⚉ URL: ${char.url}`)
            } catch (e) {
                reply('✘ API error')
            }
            return
        }
        
        // Default: fetch SFW image
        const endpoint = endpoints[action] || endpoints.waifu
        
        try {
            const { data } = await axios.get(endpoint)
            
            // Check if it's a GIF or image
            if (data.url.endsWith('.gif')) {
                const response = await axios.get(data.url, { responseType: 'arraybuffer' })
                await sock.sendMessage(m.chat, {
                    video: Buffer.from(response.data),
                    gifPlayback: true,
                    caption: `☬ ${action}`
                }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, {
                    image: { url: data.url },
                    caption: `☬ ${action}`
                }, { quoted: m })
            }
        } catch (e) {
            reply('✘ Failed to fetch anime image')
        }
    }
}
