const { getByCategory, getAll } = require('../../Plugin/crysCmd');

module.exports = {
    name: 'cmds',
    alias: ['commands', 'allcmds', 'listcmds'],
    desc: 'List all installed commands with info',
    category: 'general',

    execute: async (sock, m, { prefix, reply }) => {
        try {
            const categories = getByCategory();
            const allCommands = getAll();

            if (!allCommands.size) return reply('✘ No commands found');

            let text = '`亗✯ *CRYSNOVA COMMAND CENTER* ✯亗`\n\n';

            for (const [cat, cmds] of Object.entries(categories)) {
                text += `📂 *${cat.toUpperCase()}*\n`;
                const seen = new Set();
                cmds.forEach(c => {
                    if (c?.name && !seen.has(c.name.toLowerCase())) {
                        seen.add(c.name.toLowerCase());
                        text += `◈ ${prefix}${c.name}\n`;
                        text += `  ◦ Description: ${c.desc || 'No description'}\n`;
                        if (c.alias?.length) text += `  ◦ Aliases: ${c.alias.join(', ')}\n`;
                        text += `  ◦ Usage: ${prefix}${c.name}\n\n`;
                    }
                });
            }

            text += '✨ Type .help <command> for detailed info';

            await sock.sendMessage(m.chat, { text }, { quoted: m });
        } catch (err) {
            console.error('[LISTCMDS ERROR]', err);
            reply('✘ Failed to load commands');
        }
    }
};
