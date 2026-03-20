// ZEE BOT V2 — Status View/Like Toggle
const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'statusview',
    alias: ['autoview', 'statuslike', 'autolike'],
    desc: 'Toggle auto status view and like',
    category: 'Owner',
    sudoOnly: true,
    reactions: { start: '👁️', success: '👌' },

    execute: async (sock, m, { args, reply }) => {
        const sub = args[0]?.toLowerCase();

        const viewOn = getVar('AUTO_STATUS_VIEW', true);
        const likeOn = getVar('AUTO_STATUS_LIKE', true);

        if (!sub || sub === 'status') {
            return reply(
                `👁️ *Auto Status Settings*\n\n` +
                `• Auto View : ${viewOn ? '*✓ ON*' : '*✘ OFF*'}\n` +
                `• Auto Like : ${likeOn ? '*✓ ON*' : '*✘ OFF*'}\n\n` +
                `Commands:\n` +
                `• .statusview on/off\n` +
                `• .statuslike on/off`
            );
        }

        const turnOn = sub === 'on' || args[1]?.toLowerCase() === 'on';
        const turnOff = sub === 'off' || args[1]?.toLowerCase() === 'off';

        // Handle .autoview on/off
        if (m.text?.includes('view') || m.text?.includes('View')) {
            if (turnOn)  { setVar('AUTO_STATUS_VIEW', true);  return reply('_*✓ Auto status VIEW enabled*_'); }
            if (turnOff) { setVar('AUTO_STATUS_VIEW', false); return reply('_*✘ Auto status VIEW disabled*_'); }
        }

        // Handle .statuslike on/off
        if (m.text?.includes('like') || m.text?.includes('Like')) {
            if (turnOn)  { setVar('AUTO_STATUS_LIKE', true);  return reply('_*✓ Auto status LIKE enabled*_'); }
            if (turnOff) { setVar('AUTO_STATUS_LIKE', false); return reply('_*✘ Auto status LIKE disabled*_'); }
        

        if (turnOn) {
            setVar('AUTO_STATUS_VIEW', true);
            setVar('AUTO_STATUS_LIKE', true);
            return reply('_*♡+⎙ㅤAuto status view + like*_: *ENABLED*');
        }
        if (turnOff) {
            setVar('AUTO_STATUS_VIEW', false);
            setVar('AUTO_STATUS_LIKE', false);
            return reply('_*✘ Auto status view + like*_: *DISABLED*');
        }

        reply('_*⚉ Usage: .statusview on | .statusview off*_');
    }
};
