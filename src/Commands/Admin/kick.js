module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove a member from group',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    execute: async (sock, m, { reply }) => {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag a user to kick!\nExample: .kick @user');
        for (const user of mentioned) {
            await sock.groupParticipantsUpdate(m.chat, [user], 'remove');
        }
        await reply(`✅ Kicked ${mentioned.length} user(s)`);
    }
};
