module.exports = {
    name: 'tagall',
    alias: ['everyone', 'all'],
    desc: 'Mention all group members',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    execute: async (sock, m, { text, groupMeta }) => {
        const members = groupMeta.participants.map(p => p.id);
        const msg = text || '📢 Attention everyone!';
        const tags = members.map(p => `@${p.split('@')[0]}`).join('\n');
        await sock.sendMessage(m.chat, { text: `${msg}\n\n${tags}`, mentions: members }, { quoted: m });
    }
};
