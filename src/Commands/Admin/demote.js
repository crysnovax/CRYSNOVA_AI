module.exports = {
    name: 'demote',
    alias: ['deop'],
    desc: 'Remove admin from a member',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    execute: async (sock, m, { reply }) => {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag a user!\nExample: .demote @user');
        await sock.groupParticipantsUpdate(m.chat, mentioned, 'demote');
        await reply(`✅ Demoted ${mentioned.length} user(s)`);
    }
};
