// ttsvoices.js - Fixed version
module.exports = {
    name: 'listvoice',
    alias: ['voicelist'],
    desc: 'List available TTS voices',
    category: 'AI',

    execute: async (sock, m, { reply }) => {
        try {
            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = 'https://apis.prexzyvilla.site/tts/tts-voices';
            const res = await fetch(apiUrl);
            
            if (!res.ok) return reply('_*⚉ Failed to fetch voice list*_');

            const json = await res.json();
            const voices = json.voices || [];

            if (!voices.length) return reply('_*⚉ No voices found*_');

            // Format voice list with actual names
            let voiceList = voices.slice(0, 15).map((voice, index) => {
                return `${index + 1}. *${voice}*`;
            }).join('\n');

            const message = `*⚉ AVAILABLE TTS VOICES ⚉*

${voiceList}

_...and ${voices.length - 15} more_

☬ Use: .ttsm <voice_number> <text>
☬ Example: .ttsm 3 Hello world`;

            await reply(message);

        } catch (err) {
            console.error('[TTSVOICES ERROR]', err);
            reply('_*✘ Failed to fetch voices*_');
        }
    }
};

