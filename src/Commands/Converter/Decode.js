// dec.js - Voice Note to Text (Using Core Groq)
const fs = require('fs')
const path = require('path')
const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { groq } = require('../Core/+.js')   // ← Reusable from Core

module.exports = {
    name: 'dec',
    alias: ['decode', 'transcribe', 'vtt'],
    desc: 'Convert voice note to text using Groq Whisper',
    category: 'Utils',
    reactions: { start: '🎙️', success: '📑' },

    execute: async (sock, m, { reply }) => {
        try {
            const isVoiceNote = 
                m.message?.audioMessage?.ptt === true ||
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage?.ptt === true

            if (!isVoiceNote) {
                return reply('✘ Reply to a voice note with `.dec`')
            }

            await sock.sendMessage(m.chat, { react: { text: '🎙️', key: m.key } })

            let audioMsg = m.message?.audioMessage
            if (!audioMsg && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                audioMsg = m.message.extendedTextMessage.contextInfo.quotedMessage.audioMessage
            }

            if (!audioMsg) return reply('✘ Could not detect voice note.')

            const buffer = await downloadMediaMessage(
                { message: { audioMessage: audioMsg } },
                'buffer',
                {},
                { logger: console }
            )

            const tempPath = path.join(process.cwd(), `temp_voice_${Date.now()}.ogg`)
            fs.writeFileSync(tempPath, buffer)

            // Use the reusable groq client from Core
            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(tempPath),
                model: "whisper-large-v3-turbo",
                response_format: "text",
                language: "en"
            })

            fs.unlinkSync(tempPath)

            if (!transcription?.trim()) {
                return reply('𓄄 Could not understand the audio clearly.')
            }

            await reply(`🎙️ *Voice Transcription:*\n\n${transcription.trim()}\n\n_Powered by Groq Whisper_`)

        } catch (err) {
            console.error('[DEC ERROR]', err.message)
            await reply('𓉤 Transcription failed. Please try again.')
        }
    }
}
