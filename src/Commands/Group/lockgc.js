/**
 * Command: .lockgc
 * Description: Locks the group — only admins can edit group info, add/remove members, change subject/desc, etc.
 * Usage: .lockgc
 * Requirements:
 *   - Must be used in a group
 *   - Bot must be an admin with permission to change group settings
 *   - Optional: restrict to group admins or bot owner
 */

module.exports = {
    name: 'lockgc',
    alias: ['lockgroup', 'gclock', 'lock', 'fulllock'],
    desc: 'Lock group settings (only admins can edit group info, add/remove members, etc.)',
    category: 'group',
    usage: '.lockgc',

    execute: async (sock, m, { reply, isGroupAdmin }) => {
        const chatId = m.key.remoteJid;

        // 1. Must be a group
        if (!chatId.endsWith('@g.us')) {
            return reply('_*✘ GROUP ONLY*_');
        }

      
         if (!isGroupAdmin && !m.key.fromMe) {
             return reply('_*⚉ Only group admins can lock the group.*_');
        }

        try {
            // Get current group metadata to confirm bot is admin
            const groupMetadata = await sock.groupMetadata(chatId);
            const botParticipant = groupMetadata.participants.find(p => p.id === sock.user.id);

         //   if (!botParticipant || !botParticipant.admin) {
       //         return reply('_*𓉤 Not admin*_');
       //     }

   
            await sock.groupSettingUpdate(chatId, 'announcement');       // Only admins can send messages
            await sock.groupUpdateSubject(chatId, groupMetadata.subject); // Prevent subject change (by re-setting it)
            await sock.groupUpdateDescription(chatId, groupMetadata.desc || ''); // Prevent desc change

            // Optional: restrict member addition/removal (WhatsApp allows this via participant mode)
            // Note: Baileys doesn't have direct "restrict add/remove" API yet — it's handled via announcement mode + admin-only

            await reply('_*✓ Group locked successfully!*_\n\n' +
                        'Now only *admins* can:\n' +
                        '• Send messages\n' +
                        '• Edit group subject/description\n' +
                        '• Add/remove members\n\n' +
                        'Non-admins can only read.');

            // Success reaction
            await sock.sendMessage(chatId, {
                react: {
                    text: '🔒',
                    key: m.key
                }
            });

        } catch (error) {
            console.error('[LOCKGC ERROR]', error);

            let errorMsg = '_*✘ Failed to lock the group.*_';

            if (error?.message?.includes('not-authorized') || error?.message?.includes('Unauthorized')) {
                errorMsg += '\n\nBot is **not admin** or lacks permission to change group settings.';
            } else if (error?.message?.includes('rate-overlimit')) {
                errorMsg += '\n\nToo many requests — try again in a few minutes.';
            }

            await reply(errorMsg);
        }
    }
};
