module.exports = {
    name: 'creategc',
    alias: ['creategc'],
    desc: 'Create a new WhatsApp group',
    category: 'Tools',
    execute: async (sock, m, { args, reply }) => {
        try {
            const groupName = args.join(' ');
            if (!groupName) {
                return reply('Please provide a group name.');
            }
            
            const result = await sock.groupCreate(groupName, []);
            reply(`Group "${result.subject}" created successfully!`);
        } catch (error) {
            console.error(error);
            reply('An error occurred while creating the group. Please try again.');
        }
    }
};