

const { getByCategory, getAll } = require('../../Plugin/crysCmd');
const { getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'menu',
    alias: ['help', 'list', 'cmds'],
    desc: 'Show all commands',
    category: 'Bot',
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '✨'
    },
    

    execute: async (sock, m, { prefix, config, reply }) => {

        const cats = getByCategory();

        const botName =
            getVar('botName', config.settings?.title || 'CRYSNOVA AI');

        const uptime = Math.floor((Date.now() - global.crysStats.startTime) / 60000);

        // ⭐ Count UNIQUE commands (no alias duplication)
        const total = new Set(
            [...getAll().values()]
                .filter(cmd => !cmd?.isAlias)
                .map(cmd => cmd.name?.toLowerCase())
        ).size;

        const now = new Date();

        const time = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Africa/Lagos'
        }).toLowerCase();

        let text = '';

        text += ` ╭─❍ *${botName.toUpperCase()} V2*\n`;
        text += ` │ ❏ PREFIX   : ${prefix}\n`;
        text += ` │ ❏ User: Unknown\n`;
        text += ` │ ❏ COMMANDS : ${total}\n`;
        text += ` │ ❏ UPTIME   : ${uptime} MIN\n`;
        text += ` │ ❏ MODE     : ${config.status?.public ? 'PUBLIC' : 'PRIVATE'}\n`;
        text += ` ╰─ 𓄄 \`\`\`${time}\`\`\`\n\n`;

        // ⭐ CATEGORY DISPLAY (NO DUPLICATES)
        for (const [cat, cmds] of Object.entries(cats)) {

            text += `> ╭─❍ *${cat.toUpperCase()}*\n`;

            const shown = new Set();

            for (const cmd of cmds) {

                if (!cmd?.name) continue;

                const name = cmd.name.toLowerCase();

                if (shown.has(name)) continue;

                shown.add(name);

                text += `> │ ➤ ${prefix}${cmd.name}\n`;
            }

            text += `> ╰──────────────────\n\n`;
        }

        text += ` ╭─❍ *DEVELOPER*\n`;
        text += ` │ ➤ CRYSNOVA\n`;
        text += ` │ ➤ VERSION : 2.0.0\n`;
        text += ` ╰──────────────────`;

        await sock.sendMessage(m.chat, {
            image: { url: config.thumbUrl || 'https://i.imgur.com/BoN9kdC.png' },
            caption: text,
            mimetype: 'image/png'
        }, { quoted: m });
    }
};
