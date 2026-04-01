const axios = require('axios');

module.exports = {
    name: 'kill#',
    alias: ['slay#', 'murder#'],
    desc: 'Send anime kill GIF to mentioned user',
    category: 'Anime',
    groupOnly: false,
    adminOnly: false,
    reactions: { start: '🔪', success: '💀' },

    execute: async (sock, m, { args, reply }) => {
        const API_URL = 'https://apis.prexzyvilla.site/anime/kill';
        
        // Get target from mention or quoted message
        let target = null;
        
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            target = m.mentionedJid[0];
        } else if (m.quoted && m.quoted.sender) {
            target = m.quoted.sender;
        }
        
        // Get target username
        const targetName = target 
            ? `@${target.split('@')[0]}` 
            : args[0] || 'someone';
        
        try {
            // Fetch with proper headers
            const response = await axios.get(API_URL, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || 'image/gif';
            
            // Check if it's actually a GIF or video
            const isGif = contentType.includes('gif');
            const isVideo = contentType.includes('video') || contentType.includes('mp4');
            
            // Build caption
            const caption = target 
                ? `╭─❍ *KILL SYSTEM*\n│\n│ 🔪 @${m.sender.split('@')[0]} killed ${targetName}\n│ 💀 Rest in pieces...\n╰──────────────────`
                : `╭─❍ *KILL SYSTEM*\n│\n│ 🔪 @${m.sender.split('@')[0]} is feeling murderous\n│ 💀 ${targetName} better watch out...\n╰──────────────────`;
            
            // Send based on content type
            if (isVideo) {
                // Send as video with GIF playback
                await sock.sendMessage(m.chat, {
                    video: buffer,
                    gifPlayback: true,
                    caption: caption,
                    mimetype: 'video/mp4',
                    mentions: target ? [target, m.sender] : [m.sender]
                }, { quoted: m });
            } else {
                // Send as image/GIF
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: caption,
                    mentions: target ? [target, m.sender] : [m.sender]
                }, { quoted: m });
            }
            
        } catch (err) {
            console.error('[KILL ERROR]', err.message);
            
            // Fallback: send as URL if download fails
            await sock.sendMessage(m.chat, {
                text: `╭─❍ *KILL SYSTEM*\n│\n│ 🔪 @${m.sender.split('@')[0]} killed ${targetName}\n│ 💀 ${API_URL}\n╰──────────────────`,
                mentions: target ? [target, m.sender] : [m.sender]
            }, { quoted: m });
        }
    }
};
