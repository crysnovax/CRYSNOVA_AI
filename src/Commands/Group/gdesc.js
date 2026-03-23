module.exports = {
    name: 'gdesc',
    alias: ['setdescription'],
    desc: 'Add group description',
    category: 'Tools',
    execute: async (sock, m, { args, reply, isGroup }) => {
        try {
            if (!isGroup) return reply('_*⚉ GROUP ONLY!*_.');
           // if (!isAdmin) return reply('Only admins can set the group description.');
            if (!args.length) return reply('_Please provide a new group description._');

            const newDescription = args.join(' ');
            await sock.groupUpdateDescription(m.chat, newDescription);
            reply('_*✓ Group description updated successfully!*_');
        } catch (error) {
            reply('An error occurred while updating the group description. Please try again later.');
        }
    }
};
