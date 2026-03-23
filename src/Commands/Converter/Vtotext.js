const axios = require('axios');
const FormData = require('form-data');

const GROQ_API_KEY = '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';

module.exports = {
    name: 'vtt',
    alias: ['totext', 'voicetotext'],
    category: 'tools',

    execute: async (sock, m, { reply }) => {
        try {
            let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                return reply('❌ Reply to a voice note');
            }

            // unwrap
            if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
            if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;

            const type = Object.keys(quoted)[0];

            if (type !== 'audioMessage') {
                return reply('❌ Only voice notes supported');
            }

            reply('🤔 Converting voice to text...');

            // download audio
            const stream = await require('@whiskeysockets/baileys')
                .downloadContentFromMessage(quoted.audioMessage, 'audio');

            let buffer = Buffer.alloc(0);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // send to Groq Whisper
            const form = new FormData();
            form.append('file', buffer, {
                filename: 'audio.ogg',
                contentType: 'audio/ogg'
            });
            form.append('model', 'whisper-large-v3');

            const res = await axios.post(
                'https://api.groq.com/openai/v1/audio/transcriptions',
                form,
                {
                    headers: {
                        Authorization: `Bearer ${GROQ_API_KEY}`,
                        ...form.getHeaders()
                    }
                }
            );

            const text = res.data?.text;

            if (!text) {
                return reply('❌ Failed to transcribe');
            }

            await sock.sendMessage(m.chat, {
                text:
`╭─❍ *VOICE TO TEXT* 🎙️
│
│ ${text}
╰────────────────`
            }, { quoted: m });

        } catch (err) {
            console.log('[VTT ERROR]', err?.message);
            reply('❌ Error converting voice');
        }
    }
};