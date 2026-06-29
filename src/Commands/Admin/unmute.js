const core = require('../../Plugin/mute-core');

module.exports = {
    name: 'unmute',
    alias: ['unsilence', 'groupunmute'],
    desc: 'Unmute the group and cancel any active mute timer',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,
    reactions: { start: '🔊', success: '✦' },

    execute: async (sock, m, { reply }) => {
        const groupJid = m.chat;

        // Clear active timer if muted with .mute for
        if (global.muteTimers?.[groupJid]) {
            clearTimeout(global.muteTimers[groupJid]);
            delete global.muteTimers[groupJid];
        }

        await sock.groupSettingUpdate(groupJid, 'not_announcement');
        return reply('🔊 Group unmuted — everyone can chat now');
    }
};

