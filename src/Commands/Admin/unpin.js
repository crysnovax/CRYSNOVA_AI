// File: src/Commands/Group/unpin.js

module.exports = {
    name: 'unpin',
    alias: ['unpinmsg', 'removepin'],
    desc: 'Unpin a pinned message in the group',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,

    execute: async (sock, m, { reply }) => {
        try {
            const chat = m.chat;
            const quoted = m.quoted || {};

            if (!quoted.key) {
                return reply(
                    `ⓘ *Usage:*\n` +
                    `.unpin (reply to a pinned message)\n\n` +
                    `*Example:* Reply to a pinned message and type .unpin`
                );
            }

            await sock.sendMessage(chat, {
                pin: quoted.key,
                type: 0  // 0 = unpin, 1 = pin
            });

            reply(`✓ Message unpinned successfully!`);

        } catch (err) {
            console.error('[UNPIN ERROR]', err);
            reply(`𓃵 Failed to unpin: ${err.message}`);
        }
    }
};
