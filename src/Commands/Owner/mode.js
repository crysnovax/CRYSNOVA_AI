module.exports = {
    name: 'mode',
    alias: [],
    desc: 'Switch bot mode between public and private',
    category: 'Bot',
    ownerOnly: true,
    execute: async (sock, m, { args, reply, config }) => {
        if (!args[0] || !['public', 'private'].includes(args[0].toLowerCase())) {
            return reply('_*Usage*: ```.mode <public|private>```');
        }

        const mode = args[0].toLowerCase();
        config.status.public = mode === 'public'; // update in-memory config

        reply(`_✓ Bot mode set to *${mode.toUpperCase()}*_`);
    }
};
