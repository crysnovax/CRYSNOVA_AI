module.exports = {
    name: 'bio',
    alias: ['setbio', 'about', 'setabout'],
    desc: 'Change bot WhatsApp bio/about',
    category: 'Owner',
    owner: true,
    reactions: { start: '✏️', success: '☘️', error: '❔' },

    execute: async (sock, m, { args, reply }) => {
        const bio = args.join(' ').trim() || m.quoted?.body || m.quoted?.text || '';
        if (!bio) return reply('✐ _Usage: .bio <new bio>_');

        try {
            await sock.sendMessage(m.chat, { react: { text: '✏️', key: m.key } });
            await sock.updateProfileStatus(bio);
            await sock.sendMessage(m.chat, { react: { text: '☘️', key: m.key } });
            return reply(`✓ *Bio updated:* ${bio}`);
        } catch (err) {
            console.error('[BIO ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            return reply(`\`✘ Error: ${err.message}\``);
        }
    }
};
