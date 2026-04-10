const axios = require('axios');
const config = require('../../../settings/config');

const GATEWAY_URL = config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = config.api?.gatewayToken || '';

module.exports = {
    name: 'lyrics',
    alias: ['lyric', 'songtext'],
    desc: 'Search for song lyrics',
    category: 'Search',
    usage: '.lyrics <song title>',

    execute: async (sock, m, { args, reply }) => {
        const title = args.join(' ').trim();
        if (!title) return reply('ಠ_ಠ _*Provide a song title*_');

        try {
            await sock.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
            
            const res = await axios.get(`${GATEWAY_URL}/search/lyrics?token=${GATEWAY_TOKEN}&title=${encodeURIComponent(title)}`);
            const data = res.data;
            
            // Extract lyrics from the response
            let lyricsText = '';
            let artist = '';
            let songTitle = '';
            
            if (data.data) {
                lyricsText = data.data.lyrics || '';
                artist = data.data.artist || '';
                songTitle = data.data.title || title;
            } else if (data.lyrics) {
                lyricsText = data.lyrics;
            } else if (typeof data === 'string') {
                lyricsText = data;
            }
            
            if (!lyricsText) {
                return reply('✘ No lyrics found for this song');
            }
            
            // Format the output
            let text = `𖣘 *LYRICS*\n\n`;
            if (artist && songTitle) {
                text += `🎤 *${artist}* - *${songTitle}*\n\n`;
            }
            
            // Trim if too long for WhatsApp (max ~4000 chars)
            if (lyricsText.length > 3500) {
                lyricsText = lyricsText.slice(0, 3500) + '...';
            }
            
            text += lyricsText;
            text += `\n\n_⚉ CRYSNOVA Gateway_`;
            
            await sock.sendMessage(m.chat, { text }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            
        } catch (err) {
            console.error('[LYRICS]', err.message);
            reply('✘ Failed to fetch lyrics');
        }
    }
};