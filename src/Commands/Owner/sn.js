module.exports = {
    name: 'setname',
    alias: ['myname', 'username'],
    desc: 'Change bot WhatsApp display name',
    category: 'Owner',
    owner: true,
    reactions: { start: '✏️', success: '🍃', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const name = args.join(' ').trim() || m.quoted?.body || m.quoted?.text || '';
        if (!name) return reply('✐ _Usage: .name <new name>_');

        try {
            await sock.sendMessage(m.chat, { react: { text: '✏️', key: m.key } });
            await sock.updateProfileName(name);
            await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
            return reply(`✓ *Name updated:* ${name}`);
        } catch (err) {
            console.error('[NAME ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply(`\`✘ Error: ${err.message}\``);
        }
    }
};
