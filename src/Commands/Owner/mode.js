const { setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'mode',
    alias: [],
    desc: 'Switch bot mode between public and private',
    category: 'Bot',
    ownerOnly: true,
    execute: async (sock, m, { args, reply, config }) => {
        if (!args[0] || !['public', 'private'].includes(args[0].toLowerCase())) {
            const current = config.status.public ? 'PUBLIC' : 'PRIVATE';
            return reply(`_*⁠☞⁠ ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠)⁠☞ Usage:*_ \`.mode <public|private>\`\n\n_*Current:*_ _*${current}*_`);
        }

        const mode    = args[0].toLowerCase();
        const isPublic = mode === 'public';

        // 1. Update in-memory so it takes effect immediately
        config.status.public = isPublic;

        // 2. Persist to runtime-config.json so it survives restarts
        setVar('PUBLIC_MODE', isPublic);

        reply(`_*❏◦SET TO ${mode.toUpperCase()} 彡*_`);
    }
};

