module.exports = {
    name: 'jid',
    alias: ['getjid', 'chatid'],
    desc: 'Get JID of current chat or convert a phone number to JID',
    category: 'Tools',
    usage: '.jid OR .jid 2348077134210',
    reactions: { start: '📱', success: '💬', error: '📡' },

    execute: async (sock, m, { args, reply, prefix }) => {
        await sock.sendMessage(m.chat, { react: { text: '📱', key: m.key } });

        try {
            let jid;
            let source = '';

            // Case 1: No args - get current chat JID
            if (!args[0]) {
                jid = m.chat;
                source = 'Current Chat';
                
                let chatType = 'Private Chat';
                if (jid.includes('@g.us')) {
                    chatType = 'Group Chat';
                } else if (jid.includes('@newsletter')) {
                    chatType = 'Newsletter';
                } else if (jid.includes('@broadcast')) {
                    chatType = 'Broadcast List';
                }

                await sock.sendMessage(m.chat, {
                    text: `*� CHAT JID*\n\n╭─❍ *${chatType}*\n│\n│ ⚉ *JID:* \`${jid}\`\n│\n│ ✪ *From:* ${source}\n│\n│ _👇 Tap the button to copy_\n╰──────────────────`,
                    nativeFlow: [{
                        text: '📋 Copy JID',
                        copy: jid
                    }]
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });
                return;
            }

            // Case 2: Has args - convert number to JID
            let number = args[0].replace(/[^0-9]/g, '');
            
            // Remove leading zero if present
            if (number.startsWith('0')) {
                number = number.substring(1);
            }
            
            // Basic validation - should start with country code
            if (number.length < 10 || number.length > 15) {
                await sock.sendMessage(m.chat, { react: { text: '⊘', key: m.key } });
                return reply(`⊘ *Invalid phone number!*\n\nUse international format without +\n📝 *Example:* ${prefix}jid 2348077134210`);
            }

            jid = `${number}@s.whatsapp.net`;
            source = `Number: ${number}`;

            await sock.sendMessage(m.chat, {
                text: `*𓆣 NUMBER TO JID*\n\n╭─❍ *Conversion*\n│\n│ ⚉ *Number:* ${number}\n│ ۞ *JID:* \`${jid}\`\n│\n│ ✪ *From:* ${source}\n│\n│ _👇 Tap the button to copy_\n╰──────────────────`,
                nativeFlow: [{
                    text: '📋 Copy JID',
                    copy: jid
                }]
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });

        } catch (error) {
            console.error('[JID ERROR]', error);
            await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
            reply('⊘ *An error occurred while retrieving the JID.*');
        }
    }
};
