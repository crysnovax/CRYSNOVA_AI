const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

module.exports = {
    name: 'tts',
    alias: ['say', 'speak', 'voice'],
    category: 'WhatsApp',
    
    execute: async (sock, m, { reply, args, quoted }) => {
        
        const text = args.join(' ') || quoted?.text
        if (!text) return reply(`⚉ Provide text to convert to speech

Examples:
.tts Hello world
.tts (reply to message)

☬ Languages: en, es, fr, de, id, ja, ko, ar`)
        
        const lang = args[0]?.length === 2 ? args.shift() : 'en'
        const finalText = args.join(' ') || text
        
        if (finalText.length > 500) 
            return reply('✘ Text too long (max 500 chars)')

        const tempDir = path.join(__dirname, '../../temp')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
        
        const outputPath = path.join(tempDir, `tts_${Date.now()}.mp3`)

        try {
            reply('𓄄 Generating speech...')
            
            // Method 1: gTTS (if installed)
            try {
                await new Promise((resolve, reject) => {
                    exec(`gtts-cli "${finalText.replace(/"/g, '\\"')}" --lang ${lang} --output "${outputPath}"`, 
                        { timeout: 30000 }, 
                        (err) => {
                            if (err) reject(err)
                            else resolve()
                        }
                    )
                })
            } catch (gttsErr) {
                // Method 2: Google Translate TTS API (fallback)
                const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(finalText)}&tl=${lang}&client=tw-ob`
                
                const response = await axios.get(ttsUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                })
                
                fs.writeFileSync(outputPath, Buffer.from(response.data))
            }

            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(outputPath),
                mimetype: 'audio/mp4',
                ptt: true, // Voice note
                caption: `☬ TTS: ${finalText.substring(0, 50)}...`
            }, { quoted: m })

        } catch (e) {
            reply('✘ Failed to generate speech. Install gTTS: pip install gTTS')
        } finally {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        }
    }
}
