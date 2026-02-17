module.exports = {
    command: '\u200E', // invisible prefix
    description: 'Owner-only invisible tag shortcut with random reactions',
    category: 'owner',
    execute: async (sock, m, { isCreator }) => {
        try {
            if (!isCreator) return; // only owner
            if (!m.isGroup) return;

            // Random reaction options (including no reaction)
            const reactions = ['⚡','✨','🔥','💥','']; 
            const chosen = reactions[Math.floor(Math.random() * reactions.length)];

            // React only if chosen is not empty
            if (chosen) {
                await sock.sendMessage(m.chat, {
                    react: { text: chosen, key: m.key }
                });
            }

            // Call your existing tagall logic
            await require('./tagall.js').execute(sock, m, { isCreator });

        } catch (err) {
            console.log("Invisible tag shortcut error:", err.message);
        }
    }
};
