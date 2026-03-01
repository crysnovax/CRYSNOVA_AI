module.exports = {
    name: 'linkgc',
    alias: ['gclink', 'link', 'invitelink', 'grouplink'],
    desc: 'Get the current shareable group invite link (with preview)',
    category: 'group',
    usage: '.linkgc',

    execute: async (sock, m, { reply }) => {
        if (!m.isGroup) {
            return reply('𓉤 ⚉ This command works only in groups');
        }

        try {
            // Try to get the current invite code
            const code = await sock.groupInviteCode(m.chat);

            if (!code) {
                return reply('✘ ⚉ Could not retrieve invite code');
            }

            const link = `https://chat.whatsapp.com/${code}`;

            // Optional: fetch metadata for better message (group name + desc)
            let metadata;
            try {
                metadata = await sock.groupMetadata(m.chat);
            } catch (e) {
                // metadata fetch can fail sometimes → continue anyway
                console.error('[LINKGC METADATA]', e?.message || e);
            }

            const groupName = metadata?.subject || 'This Group';
            const desc = metadata?.desc || 'No description set';

            // Build a nice formatted message
            const text = `✪ *Group Invite Link*\n\n` +
                         `Group: *${groupName}*\n` +
                         `Description: ${desc}\n\n` +
                         `→ ${link}\n\n` +
                         `Tap the link to join directly (preview should show group info)`;

            await sock.sendMessage(m.chat, { text }, { quoted: m });

            // Or if you prefer a shorter version with just the link (preview will still work):
            // await sock.sendMessage(m.chat, { text: `Group link: ${link}` }, { quoted: m });

        } catch (err) {
            console.error('[LINKGC ERROR]', err?.message || err);

            let msg = '✘ ⚉ Failed to get group link\n\n';

            if (err?.message?.includes('admin') || err?.message?.includes('permission') || err?.message?.includes('not-authorized')) {
                msg += '𓉤 Bot must be an admin to get the invite link';
            } else if (err?.message?.includes('revoked') || err?.message?.includes('invalid')) {
                msg += '𓉤 Invite link is revoked or invalid — use .resetlink first';
            } else {
                msg += `𓉤 ${err?.message || 'Unknown error'}`;
            }

            reply(msg);
        }
    }
};