const config = require('../../../settings/config');

module.exports = {
    name: 'forward',
    alias: ['fwd', 'sendto'],
    desc: 'Forward replied message to another chat (JID or invite link)',
    category: 'Tools',
    usage: '.forward [jid] or .forward [invite_link]',
    reactions: { start: '📨', success: '💬', error: '🙄' },

    execute: async (sock, m, { reply, sender, args }) => {
        await sock.sendMessage(m.chat, { react: { text: '📨', key: m.key } });

        if (!m.quoted) {
            await reply('⊘ *Please reply to a message to forward!*');
            return sock.sendMessage(m.chat, { react: { text: '😑', key: m.key } });
        }

        if (!args[0]) {
            await reply('⊘ *Please provide target JID or invite link!*');
            return sock.sendMessage(m.chat, { react: { text: '😑', key: m.key } });
        }

        let targetJid = args[0];

        try {
            if (targetJid.includes('chat.whatsapp.com')) {
                const inviteCode = targetJid.split('chat.whatsapp.com/')[1].split('?')[0];
                const groupInfo = await sock.groupGetInviteInfo(inviteCode);
                targetJid = groupInfo.id;
            }

            else if (targetJid.includes('wa.me/')) {
                let phone = targetJid.split('wa.me/')[1].split('?')[0];
                targetJid = `${phone}@s.whatsapp.net`;
            }

            else if (!targetJid.includes('@')) {
                targetJid = `${targetJid}@s.whatsapp.net`;
            }

        } catch (e) {
            await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
            return reply('⊘ *Invalid link or invite expired*');
        }

        const q = m.quoted;

        const text =
            q.text ||
            q.caption ||
            q.body ||
            q.conversation ||
            '';

        let media = null;

        try {
            media = await sock.downloadMediaMessage(q);
        } catch {
            media = null;
        }

       
        const contextInfo = {
            forwardingScore: 1,
            isForwarded: true
        };

        // TEXT FORWARD
        if (text && !media) {
            await sock.sendMessage(targetJid, {
                text,
                contextInfo
            });

            return sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
        }

        // IMAGE
        try {
            if (q.mtype === 'imageMessage') {
                await sock.sendMessage(targetJid, {
                    image: media,
                    caption: q.caption || '',
                    contextInfo
                });

                return sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            }
        } catch {}

        // VIDEO
        try {
            if (q.mtype === 'videoMessage') {
                await sock.sendMessage(targetJid, {
                    video: media,
                    caption: q.caption || '',
                    contextInfo
                });

                return sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            }
        } catch {}

        // AUDIO
        try {
            if (q.mtype === 'audioMessage') {
                await sock.sendMessage(targetJid, {
                    audio: media,
                    ptt: q.ptt || false,
                    contextInfo
                });

                return sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            }
        } catch {}

        // STICKER
        try {
            if (q.mtype === 'stickerMessage') {
                await sock.sendMessage(targetJid, {
                    sticker: media,
                    contextInfo
                });

                return sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            }
        } catch {}

        return reply('⊘ Unsupported message type.');
    }
};
