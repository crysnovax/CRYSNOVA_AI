module.exports = {
    name: 'promote',
    alias: ['op'],
    desc: 'Make a member admin',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    execute: async (sock, m, { reply }) => {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag a user!\nExample: .promote @user');
        await sock.groupParticipantsUpdate(m.chat, mentioned, 'promote');
        await reply(`✅ Promoted ${mentioned.length} user(s) to admin`);
    }
};
