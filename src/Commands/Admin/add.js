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

            // ✅ FORMAT NUMBER (handles spaces, +, etc)
            let number = args.join(' ').replace(/[^0-9]/g, '');
            if (number.startsWith('0')) number = '234' + number.slice(1);
            if (!number.startsWith('234')) number = '234' + number;

            const jid = number + '@s.whatsapp.net';

            const meta = await sock.groupMetadata(m.chat);
            const groupName = meta.subject;

            // ✅ TRY DIRECT ADD
            let res = await sock.groupParticipantsUpdate(m.chat, [jid], 'add');
            const status = res?.[0]?.status;

            // ✅ SUCCESS
            if (status == 200 || status == '200') {
                return await sock.sendMessage(m.chat, {
                    text: `_*⟁⃝  @${number} has been added to the group.*_`,
                    mentions: [jid]
                }, { quoted: m });
            }

            // ❌ PRIVACY BLOCK → SEND INVITE (NO SPIN BUG)
            if (['403', '401', '409'].includes(String(status))) {

                // 🔥 fresh invite
                const freshCode = await sock.groupInviteCode(m.chat);
                const inviteLink = `https://chat.whatsapp.com/${freshCode}`;

                // thumbnail
                let thumbnail = null;
                try {
                    const pp = await sock.profilePictureUrl(m.chat, 'image');
                    thumbnail = await fetch(pp).then(r => r.buffer());
                } catch {}

                try {
                    // ✅ Send invite WITHOUT quoting anything
                    await sock.sendMessage(jid, {
                        text: `👋 You were invited to join *${groupName}*\n 🥏_*CRYSNOVA AI*_\n   ${inviteLink} 𓊈𝑽꯭𝑰꯭𝑷ࠡࠡࠡࠡࠢ𓊉`,
                        contextInfo: {
                            externalAdReply: {
                                title: groupName,
                                body: 'Tap to join WhatsApp group',
                                thumbnail: thumbnail || null,
                                sourceUrl: inviteLink,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                showAdAttribution: true
                            }
                        }
                    }); // No { quoted: m } here

                    // ✅ CONFIRM IN GROUP (this can keep quoting if you want, it's not the invite link)
                    await sock.sendMessage(m.chat, {
                        text: `_*📩 Invite sent to @${number}—͟͟͞͞𖣘*_`,
                        mentions: [jid]
                    }, { quoted: m });

                } catch (err) {
                    console.log('DM FAILED:', err);

                    // ❗ FALLBACK → Send invite link in group WITHOUT quoting
                    await sock.sendMessage(m.chat, {
                        text: `🔗 Couldn't DM @${number}\n${inviteLink}`,
                        mentions: [jid]
                    }); // No { quoted: m } here
                }

                return;
            }

            // ❌ OTHER ERROR
            return await sock.sendMessage(m.chat, {
                text: `_*✘ Failed to add @${number} (status: ${status})*_`,
                mentions: [jid]
            }, { quoted: m });

        } catch (e) {
            console.error('ADD ERROR:', e);
            reply(`❌ Error: ${e.message}`);
        }
    }
};
