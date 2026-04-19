const axios = require('axios');
module.exports = {
    name: 'getpp',
    alias: ['pp', 'profilepic'],
    desc: 'Download tagged user profile picture',
    category: 'Utils',
     // ⭐ Reaction config
    reactions: {
        start: '😉',
        success: '✨'
    },
    
    execute: async (sock, m, { reply }) => {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('✘ Tag a user!\nExample: .getpp @user');
        const target = mentioned[0];
        try {
            const url = await sock.profilePictureUrl(target, 'image');
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            await sock.sendMessage(m.sender, {
                image: Buffer.from(res.data),
                caption: `_*@${target.split('@')[0]}*_`,
                mentions: [target]
            });
            await reply(`( ͡❛ ₃ ͡❛) CHECK DM`);
        } catch { await reply('_✘ Could not get profile picture! User may have privacy settings._'); }
    }
};
