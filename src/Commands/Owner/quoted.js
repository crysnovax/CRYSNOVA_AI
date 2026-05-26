module.exports = {
    name: 'quoted',
    alias: ['getquoted', 'showquoted'],
    desc: 'Get the exact quoted message content',
    category: 'Tools',
    usage: '.quoted (reply to a message that quotes another)',
    reactions: { start: '📝', success: '💬', error: '📡' },

    execute: async (sock, m, { reply, store }) => {
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
                bRawMsg?.stickerMessage?.contextInfo ||
                null;

            if (!bContextInfo?.quotedMessage) {
                await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
                return reply('⊘ *That message has no quoted message inside it.*');
            }

            const { getContentType, downloadContentFromMessage } = require('@crysnovax/baileys');
            const innerQuoted = bContextInfo.quotedMessage;
            const innerType = getContentType(innerQuoted);
            const innerMsg = innerQuoted[innerType] || innerQuoted;

            // Text message
            const innerText =
                innerQuoted.conversation ||
                innerMsg.text ||
                innerMsg.caption ||
                innerMsg.conversation || '';

            if (innerText) {
                await sock.sendMessage(m.chat, { text: innerText }, { quoted: m });
                await sock.sendMessage(m.chat, { react: { text: '💬', key: m.key } });
                return;
            }

            // Media messages
            const mediaTypes = {
                imageMessage:    'image',
                videoMessage:    'video',
                audioMessage:    'audio',
                documentMessage: 'document',
                stickerMessage:  'sticker',
            };

            const mediaKey = Object.keys(mediaTypes).find(k => innerQuoted[k]);

            if (mediaKey) {
                const mediaMsg = innerQuoted[mediaKey];
                const mediaType = mediaTypes[mediaKey];

                // Download the media
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                let buffer = Buffer.alloc(0);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const sendOptions = { quoted: m };

                if (mediaKey === 'imageMessage') {
                    await sock.sendMessage(m.chat, {
                        image: buffer,
                        caption: mediaMsg.caption || ''
                    }, sendOptions);

                } else if (mediaKey === 'videoMessage') {
                    await sock.sendMessage(m.chat, {
                        video: buffer,
                        caption: mediaMsg.caption || '',
                        gifPlayback: mediaMsg.gifPlayback || false
                    }, sendOptions);

                } else if (mediaKey === 'audioMessage') {
                    await sock.sendMessage(m.chat, {
                        audio: buffer,
                        mimetype: mediaMsg.mimetype || 'audio/mp4',
                        ptt: mediaMsg.ptt || false
                    }, sendOptions);

                } else if (mediaKey === 'documentMessage') {
                    await sock.sendMessage(m.chat, {
                        document: buffer,
                        mimetype: mediaMsg.mimetype || 'application/octet-stream',
                        fileName: mediaMsg.fileName || 'file'
                    }, sendOptions);

                } else if (mediaKey === 'stickerMessage') {
                    await sock.sendMessage(m.chat, {
                        sticker: buffer
                    }, sendOptions);
                }

                await sock.sendMessage(m.chat, { react: { text: '💬', key: m.key } });
                return;
            }

            // Unknown type
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply('⊘ *Unsupported message type.*');

        } catch (error) {
            console.error('[QUOTED ERROR]', error);
            await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
            reply(`⊘ *Error:* ${error.message}`);
        }
    }
};
