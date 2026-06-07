// ── calllink.js ───────────────────────────────────────────────────
module.exports = {
    name: 'calllink',
    alias: ['createcall', 'vclink'],
    desc: 'Create a WhatsApp call link',
    category: 'Owner',
    owner: true,
    reactions: { start: '📞', success: '🔗', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const type = args[0]?.toLowerCase() === 'video' ? 'video' : 'audio';
        try {
            await sock.sendMessage(m.chat, { react: { text: '📞', key: m.key } });
            const token = await sock.createCallLink(type);
            if (!token) throw new Error('No token returned');
            const link = `https://call.whatsapp.com/voice/${token}`;
            
            await sock.sendMessage(m.chat, { react: { text: '🔗', key: m.key } });
            
            // Send with clickable button template
            await sock.sendMessage(m.chat, {
                text: `╭─❍ *CALL LINK*\n│\n│ 📞 *Type:* ${type === 'video' ? '🎥 Video' : '🎙️ Audio'}\n│\n│ 🔗 *Click the button below to join*\n╰──────────────────`,
                nativeFlow: [{
                    text: `${type === 'video' ? '🎥 Join Video Call' : '🎙️ Join Audio Call'}`,
                    url: link,
                    useWebview: true
                }]
            }, { quoted: m });
            
        } catch (err) {
            console.error('[CALLLINK ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply(`\`✘ Error: ${err.message}\``);
        }
    }
};
