const axios = require('axios');
module.exports = {
    name: 'gpp',
    alias: ['grouppp', 'grouppic'],
    desc: 'Download group profile picture',
    category: 'Utils',
    groupOnly: true,
    execute: async (sock, m, { reply, groupMeta }) => {
        try {
            const url = await sock.profilePictureUrl(m.chat, 'image');
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            await sock.sendMessage(m.sender, {
                image: Buffer.from(res.data),
                caption: `📸 *Group Picture*\n👥 ${groupMeta?.subject || 'Group'}`
            });
            await reply(`✦ _*Group picture sent to your DM!*_`);
        } catch { await reply('✘ _*This group has no profile picture!*_'); }
    }
};
