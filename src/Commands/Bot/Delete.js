module.exports = {
    name: 'del',
    alias: ['delete'],
    category: 'group',
    desc: 'Delete any message in chat (group or private)',
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '🧽'
    },
    

    execute: async (sock, m, { reply }) => {
        try {
            if (!m.quoted) return reply('✘ _*Reply to a message to delete it*_');

            // Delete the quoted message
            await sock.sendMessage(m.chat, { delete: m.quoted.key });

            reply('✓ _*Message deleted*_');
        } catch (err) {
            console.error('[DEL ERROR]', err);
            reply('✘ _*Failed to delete message*_');
        }
    }
};
