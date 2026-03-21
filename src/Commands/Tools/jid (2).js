module.exports = {
    name: 'jid',
    alias: ['getjid'],
    desc: 'Get the JID of a private chat or group',
    category: 'Tools',
    execute: async (sock, m, { reply }) => {
        try {
            const jid = m.chat;
            if (!jid) {
                return reply('Jid not found!');
            }
            reply(`The JID of this chat is: ${jid}`);
        } catch (error) {
            console.error(error);
            reply('An error occurred while retrieving the JID.');
        }
    }
};