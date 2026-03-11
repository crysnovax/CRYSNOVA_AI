module.exports = {
    name: 'resetlink',
    alias: ['relink', 'resetgroup'],
    category: 'group',
    desc: 'Reset WhatsApp group invite link with preview',

    execute: async (sock, m, { reply }) => {
        if (!m.isGroup) return reply('✘ Only works in groups.');

        try {
            // Reset the group invite link
            await sock.groupRevokeInvite(m.chat);

            // Get the new invite code directly
            const code = await sock.groupInviteCode(m.chat); // code is a string
            const newLink = `https://chat.whatsapp.com/${code}`;

            // Get group metadata
            const metadata = await sock.groupMetadata(m.chat);

            // Get group icon URL
            let iconUrl = null;
            try {
                iconUrl = await sock.profilePictureUrl(m.chat, 'image');
            } catch {}

            // Send link with preview like .glink
            await sock.sendMessage(
                m.chat,
                {
                    text: `╭──────────────\n│ *GROUP LINK RESET*\n╰──────────────\n${newLink}`,
                    contextInfo: {
                        externalAdReply: {
                            title: metadata.subject,
                            body: "Tap to open group invite",
                            sourceUrl: newLink,
                            thumbnailUrl: iconUrl || undefined,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                },
                { quoted: m }
            );

        } catch (err) {
            console.error('[RESETLINK ERROR]', err);
            reply('✘ Failed to reset link. Make sure I am admin!');
        }
    }
};