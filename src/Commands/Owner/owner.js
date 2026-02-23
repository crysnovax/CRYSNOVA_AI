module.exports = {
    name: 'owner',
    alias: ['creator', 'admin'],
    desc: 'Show bot owner contact',
    category: 'Bot',
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '✨'
    },
    
    execute: async (sock, m) => {
        try {
            // Get bot’s own JID
            const ownerJid = sock.user.id; // e.g., '2348012345678@s.whatsapp.net'
            const ownerNumber = ownerJid.split('@')[0];

            // Create vCard string
            const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:CRYSNOVA BOT
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}
END:VCARD
            `.trim();

            await sock.sendMessage(m.chat, {
                contacts: {
                    displayName: 'CRYSNOVA BOT',
                    contacts: [{ vcard }]
                }
            }, { quoted: m });

        } catch (err) {
            console.log('[OWNER COMMAND ERROR]', err.message);
            await sock.sendMessage(m.chat, { text: '✘ Failed to fetch owner contact' }, { quoted: m });
        }
    }
};
