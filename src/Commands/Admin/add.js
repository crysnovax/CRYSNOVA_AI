const fetch = require('node-fetch');

module.exports = {
    name: 'add',
    alias: ['adduser'],
    category: 'Admin',
    admin: true,
    group: true,

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!m.isGroup) return reply('`—͟͟͞͞𖣘 GROUP ONLY`');
            if (!args.length) {
                return reply('_*📞 Provide a phone number*_\n_Example: .add 0807 752 8901_');
            }

            let number = args.join(' ').replace(/[^0-9]/g, '');
            if (number.startsWith('0')) number = '234' + number.slice(1);
            if (!number.startsWith('234')) number = '234' + number;

            const jid = number + '@s.whatsapp.net';
            const meta = await sock.groupMetadata(m.chat);
            const groupName = meta.subject;

            let res = await sock.groupParticipantsUpdate(m.chat, [jid], 'add');
            const status = res?.[0]?.status;

            if (status == 200 || status == '200') {
                return await sock.sendMessage(m.chat, {
                    text: `_*⟁⃝  @${number} has been added to the group.*_`,
                    mentions: [jid]
                }, { quoted: m });
            }

            if (['403', '401', '409'].includes(String(status))) {
                const freshCode = await sock.groupInviteCode(m.chat);
                const inviteLinkWithParam = `https://chat.whatsapp.com/${freshCode}?mode=gi_t`;

                let thumbnail = null;
                try {
                    const pp = await sock.profilePictureUrl(m.chat, 'image');
                    thumbnail = await fetch(pp).then(r => r.buffer());
                } catch {}

                // ✅ FORCE ?mode=gi_t using RAW proto (no Baileys processing)
                try {
                    console.log('Sending RAW invite with ?mode=gi_t:', inviteLinkWithParam);

                    await sock.sendMessage(jid, {
                        extendedTextMessage: {
                            text: inviteLinkWithParam,
                            matchedText: inviteLinkWithParam,      // ← Force full URL with param
                            canonicalUrl: inviteLinkWithParam,       // ← Force full URL with param
                            title: groupName,
                            description: 'WhatsApp Group Invite',
                            previewType: 1, // LINK preview
                            jpegThumbnail: thumbnail,
                            // No contextInfo tricks — let WhatsApp handle it natively
                        },
                        raw: true  // ← BYPASSES all Baileys URL normalization!
                    });

                    return await sock.sendMessage(m.chat, {
                        text: `_*📩 RAW ?mode=gi_t invite sent to @${number}—͟͟͞͞𖣘*_`,
                        mentions: [jid]
                    }, { quoted: m });

                } catch (err) {
                    console.log('RAW FAILED:', err);

                    // Fallback: standard send
                    await sock.sendMessage(jid, {
                        text: inviteLinkWithParam,
                        linkPreview: true
                    });

                    return await sock.sendMessage(m.chat, {
                        text: `_*📩 Fallback invite sent to @${number}—͟͟͞͞𖣘*_`,
                        mentions: [jid]
                    }, { quoted: m });
                }
            }

            return await sock.sendMessage(m.chat, {
                text: `_*✘ Failed to add @${number} (status: ${status})*_`,
                mentions: [jid]
            }, { quoted: m });

        } catch (e) {
            console.error('ADD ERROR:', e);
            reply(`𓆉 Error: ${e.message}`);
        }
    }
};
