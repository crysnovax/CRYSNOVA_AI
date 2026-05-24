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
            await sock.sendMessage(m.chat, { react: { text: '😑', key: m.key } });
            return;
        }

        if (!args[0]) {
            await reply('⊘ *Please provide target JID or invite link!*');
            await sock.sendMessage(m.chat, { react: { text: '😑', key: m.key } });
            return;
        }

        let targetJid = args[0];

        try {
            if (targetJid.includes('chat.whatsapp.com')) {
                const inviteCode = targetJid
                    .split('chat.whatsapp.com/')[1]
                    .split('?')[0];

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
            return reply(`⊘ *Invalid link or invite expired*`);
        }

        const q = m.quoted;

        // =============================
        // TEXT EXTRACTION (SAFE)
        // =============================
        const text =
            q.text ||
            q.caption ||
            q.body ||
            q.conversation ||
            '';

        // =============================
        // FIXED MEDIA DOWNLOAD (NO EMPTY KEY ERROR)
        // =============================
        let media = null;

        try {
            media = await sock.downloadMediaMessage(q);
        } catch (e) {
            media = null;
        }

        // =============================
        // TEXT FORWARD
        // =============================
        if (text) {
            await sock.sendMessage(targetJid, {
                text: `_*📨 Forwarded*_\n\n${text}`
            });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        }

        // =============================
        // MEDIA FORWARD
        // =============================
        if (!media) {
            await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
            return reply('⊘ Cannot read quoted message.');
        }

        try {
            await sock.sendMessage(targetJid, {
                image: media,
                caption: `_*📨 Forwarded*_\n\n${q.caption || ''}`
            });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        } catch {}

        try {
            await sock.sendMessage(targetJid, {
                video: media,
                caption: `_*📨 Forwarded*_\n\n${q.caption || ''}`
            });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        } catch {}

        try {
            await sock.sendMessage(targetJid, {
                audio: media,
                ptt: q.ptt || false
            });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        } catch {}

        try {
            await sock.sendMessage(targetJid, {
                sticker: media
            });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        } catch {}

        await sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } });
        return reply('⊘ Unsupported message type.');
    }
};
