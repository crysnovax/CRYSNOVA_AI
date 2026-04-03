const { getByCategory, getAll } = require('../../Plugin/crysCmd');

module.exports = {
    name: 'cmds',
    alias: ['commands', 'allcmds', 'listcmds'],
    desc: 'List all installed commands with info',
    category: 'general',
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '❔'
    },
    

    execute: async (sock, m, { prefix, reply }) => {
        try {
            const categories = getByCategory();
            const allCommands = getAll();

            if (!allCommands.size) return reply('✘ No commands found');

            let text = '`◥◣*CRYSNOVA COMMAND CENTER*◢◤`\n\n';

            for (const [cat, cmds] of Object.entries(categories)) {
                text += `📂 ✐ ❏◦*${cat.toUpperCase()}* 𓀀\n`;
                const seen = new Set();
                cmds.forEach(c => {
                    if (c?.name && !seen.has(c.name.toLowerCase())) {
                        seen.add(c.name.toLowerCase());
                        text += `𒆜◈ ${prefix}${c.name}\n`;
                        text += `  ℘∞ Description: ${c.desc || 'No description'}\n`;
                        if (c.alias?.length) text += `  ◦ Aliases: ${c.alias.join(', ')}\n`;
                        text += `  ✐◦ Usage: ${prefix}${c.name}\n\n`;
                    }
                });
            }

            text += '_*☞⁠ ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠)⁠☞ Type .help <command> for detailed info*_';

            await sock.sendMessage(m.chat, { text }, { quoted: m });
        } catch (err) {
            console.error('[LISTCMDS ERROR]', err);
            reply('✘ Failed to load commands');
        }
    }
};
