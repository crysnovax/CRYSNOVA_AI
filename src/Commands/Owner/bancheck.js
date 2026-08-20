function normalizeNumber(value = '') {
    return String(value).replace(/[^0-9]/g, '');
}

module.exports = {
    name: 'bancheck',
    alias: ['checkban', 'numbercheck'],
    category: 'Owner',
    ownerOnly: true,
    desc: 'Check WhatsApp registration/reachability without claiming an official ban verdict',
    execute: async (sock, m, { args = [], reply }) => {
        const number = normalizeNumber(args[0] || m?.sender || '');
        if (!number) return reply('Usage: .bancheck <country-code-and-number>');
        if (typeof sock.onWhatsApp !== 'function') {
            return reply('This Baileys runtime does not expose onWhatsApp, so reachability cannot be checked.');
        }

        try {
            const result = await sock.onWhatsApp(`${number}@s.whatsapp.net`);
            const entry = Array.isArray(result) ? result[0] : result;
            const jid = entry?.jid || `${number}@s.whatsapp.net`;
            const registered = entry?.exists === true || entry?.status === 200;
            return reply([
                `Number: ${number}`,
                `Status: ${registered ? 'registered/reachable' : 'not confirmed as registered'}`,
                'Note: this is a registration/reachability check, not an official account-ban verdict.'
            ].join('\n'));
        } catch (error) {
            return reply(`Ban check could not complete for ${number}: ${error?.message || error}\nNote: this is not an official account-ban verdict.`);
        }
    },
    normalizeNumber
};
