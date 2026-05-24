/* I'm still working on this for now it's just a sent text i haven't
 * updated my baileys [ @crysnovax/baileys ^v 2.5.0 ] 
 * to support repost tag... until then please bear with me
 */
module.exports = {
    name: 'repost',
    alias: ['resend'],
    desc: 'Repost a replied message',
    category: 'Tools',

    execute: async (sock, m, { reply, args }) => {

        if (!m.quoted) {
            return reply('⊘ Reply to a message first.');
        }

        if (!args[0]) {
            return reply(
                '⊘ Provide target chat!\n\n' +
                'Examples:\n' +
                '• .repost 2348xxxx@s.whatsapp.net\n' +
                '• .repost https://chat.whatsapp.com/xxxxx\n' +
                '• .repost https://wa.me/2348xxxx'
            );
        }

        let target = args[0];

        try {
            // GROUP INVITE
            if (target.includes('chat.whatsapp.com')) {
                const code = target.split('chat.whatsapp.com/')[1].split('?')[0];
                const info = await sock.groupGetInviteInfo(code);
                target = info.id;

                if (!target) return reply('⊘ Could not resolve group JID.');
            //    await reply(`🔗 Group detected: ${info.subject}`);
            }

            // WA.ME
            else if (target.includes('wa.me/')) {
                const num = target.split('wa.me/')[1].split('?')[0];
                target = `${num}@s.whatsapp.net`;
            }

            // RAW NUMBER
            else if (!target.includes('@')) {
                target = `${target}@s.whatsapp.net`;
            }

        } catch (e) {
            return reply('⊘ Invalid link or expired invite.');
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
        } catch (e) {
            media = null;
        }

        // TEXT ONLY
        if (text && !media) {
            await sock.sendMessage(target, {
                text: `${text}`
            });

      //      return reply('🔁 Reposted as text');
        }

        // MEDIA SEND
        if (media) {
            try {
                if (q.mtype === 'imageMessage') {
                    await sock.sendMessage(target, {
                        image: media,
                        caption: `${q.caption || ''}`
                    });
                }

                else if (q.mtype === 'videoMessage') {
                    await sock.sendMessage(target, {
                        video: media,
                        caption: `${q.caption || ''}`
                    });
                }

                else if (q.mtype === 'audioMessage') {
                    await sock.sendMessage(target, {
                        audio: media,
                        ptt: q.ptt || false
                    });
                }

                else if (q.mtype === 'stickerMessage') {
                    await sock.sendMessage(target, {
                        sticker: media
                    });
                }

                else {
                    await sock.sendMessage(target, {
                        document: media,
                        fileName: 'repost-file'
                    });
                }

     //           return reply('🔁 Reposted successfully');
            } catch (e) {
                return reply('⊘ Failed to repost media.');
            }
        }

        return reply('⊘ Unsupported message type.');
    }
};
