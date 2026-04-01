module.exports = {
    name: 'remcmd',
    alias: [],
    desc: 'Delete a specific command from generated commands.',
    category: 'Tools',
    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args[0]) {
                return reply('Please provide the command name to delete.');
            }

            const commandName = args[0];
            const commandPath = `./src/Commands/Generated/${commandName}.js`;

            const fs = require('fs');

            if (fs.existsSync(commandPath)) {
                fs.unlinkSync(commandPath);
                return reply(`Command ${commandName} has been deleted successfully.`);
            } else {
                return reply(`Command ${commandName} does not exist.`);
            }
        } catch (error) {
            return reply('An error occurred while trying to delete the command: ' + error.message);
        }
    }
};
