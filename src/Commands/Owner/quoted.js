module.exports = {
    name: 'quoted',
    alias: ['getquoted', 'showquoted'],
    desc: 'Get the exact quoted message content',
    category: 'Tools',
    usage: '.quoted (reply to a message that quotes another)',
    reactions: { start: '📝', success: '💬', error: '📡' },

    execute: async (sock, m, { reply, store }) => {  // ← customStore → store
        await sock.sendMessage(m.chat, { react: { text: '📝', key: m.key } });

        if (!m.quoted) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply('⊘ *Reply to a message to use this command!*');
        }

        try {
            const bMsgId = m.quoted.id;
            const bMsgJid = m.quoted.chat || m.chat;
            const storeKey = bMsgJid + ':' + bMsgId;

            const stored = store?.messages?.get(storeKey);

            if (!stored?.message?.message) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply('⊘ *Could not load the replied message from store. It may be too old or the bot just restarted.*');
            }

            const bRawMsg = stored.message.message;
            const bContextInfo =
                bRawMsg?.extendedTextMessage?.contextInfo ||
                bRawMsg?.imageMessage?.contextInfo ||
                bRawMsg?.videoMessage?.contextInfo ||
                bRawMsg?.audioMessage?.contextInfo ||
                bRawMsg?.documentMessage?.contextInfo ||
                null;

            if (!bContextInfo?.quotedMessage) {
                await sock.sendMessage(m.chat, { react: { text: '📡', key: m.key } });
                return reply('⊘ *That message has no quoted message inside it.*');
            }

            const { getContentType } = require('@crysnovax/baileys');
            const innerQuoted = bContextInfo.quotedMessage;
            const innerType = getContentType(innerQuoted);
            const innerMsg = innerQuoted[innerType] || innerQuoted;

            const innerText =
                innerQuoted.conversation ||
                innerMsg.text ||
                innerMsg.caption ||
                innerMsg.conversation || '';

            if (!innerText) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply('⊘ *No text found. The inner quoted message may be media only.*');
            }

            await sock.sendMessage(m.chat, { text: innerText }, { quoted: m });
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });

        } catch (error) {
            console.error('[QUOTED ERROR]', error);
            await sock.sendMessage(m.chat, { react: { text: '📡', key: m.key } });
            reply(`⊘ *Error:* ${error.message}`);
        }
    }
};
