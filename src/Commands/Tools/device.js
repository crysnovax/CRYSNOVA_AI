const DEVICE_LABELS = {
    ios: 'iPhone (iOS)',
    android: 'Android',
    web: 'WhatsApp Web',
    desktop: 'WhatsApp Desktop',
    unknown: 'Unknown device',
};

function detectDevice(messageId) {
    try {
        const { getDevice } = require('@crysnovax/baileys');
        if (typeof getDevice === 'function') return getDevice(messageId);
    } catch {}
    // Fallback: same prediction rules Baileys uses internally.
    const id = String(messageId || '');
    if (/^3A.{18}$/.test(id)) return 'ios';
    if (/^3E.{20}$/.test(id)) return 'web';
    if (/^(.{21}|.{32})$/.test(id)) return 'android';
    if (/^(3F|.{18}$)/.test(id)) return 'desktop';
    return 'unknown';
}

module.exports = {
    name: 'device',
    alias: ['checkdevice', 'dev'],
    desc: 'Detect the device a message was sent from',
    category: 'Tools',
    usage: '.device (reply to a message)',
    reactions: { start: '📱', success: '✅', error: '❌' },

    execute: async (sock, m, { reply }) => {
        const quotedId = m.quoted?.key?.id || m.quoted?.id
            || m.msg?.contextInfo?.stanzaId
            || m.message?.extendedTextMessage?.contextInfo?.stanzaId;

        const targetId = quotedId || m.key?.id;
        const targetSender = quotedId
            ? (m.quoted?.sender || m.msg?.contextInfo?.participant || 'that user')
            : (m.sender || 'you');

        if (!targetId) return reply('Could not read a message ID. Reply to a message with .device');

        const device = detectDevice(targetId);
        const label = DEVICE_LABELS[device] || DEVICE_LABELS.unknown;
        const who = quotedId ? `@${String(targetSender).split('@')[0]}` : 'You';

        return sock.sendMessage(m.chat, {
            text: `📱 *Device Check*\n\n${who} sent that message from: *${label}*\n\n_Prediction is based on the WhatsApp message ID pattern._`,
            mentions: quotedId && String(targetSender).includes('@') ? [targetSender] : [],
        }, { quoted: m });
    },

    detectDevice,
};
