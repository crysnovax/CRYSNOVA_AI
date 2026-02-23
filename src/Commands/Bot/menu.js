const { getByCategory } = require('../../Plugin/crysCmd');
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
    

    execute: async (sock, m, { prefix, config }) => {
        const cats = getByCategory();
        const botName = getVar('botName', config.settings.title) || 'CRYSNOVA AI';
        const uptime = Math.floor((Date.now() - global.crysStats.startTime) / 60000);
        const total = [...require('../../Plugin/crysCmd').getAll().keys()]
            .filter(k => !require('../../Plugin/crysCmd').getAll().get(k).isAlias).length;

        // Real Nigerian time (WAT / Africa/Lagos)
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Africa/Lagos'
        }).toLowerCase();

        // Get bot's display name (fallback to number)
        let botDisplay = 'Unknown';
        try {
            const botJid = sock.user?.id;
            if (botJid) {
                // Try to get contact info (display name if saved)
                const contact = await sock.getContact(botJid);
                botDisplay = contact?.name || contact?.notify || botJid.split(':')[0];
            }
        } catch {}

        const userSection = `User: ${botDisplay}`;

        let text = '';

        // ── MENU HEAD with PREFIX & USER ──
        text += ` ╭─❍ *${botName.toUpperCase()} V2*\n`;
        text += ` │ ❏ PREFIX   : ${prefix}\n`;
        text += ` │ ❏ ${userSection}\n`;
        text += ` │ ❏ COMMANDS : ${total}\n`;
        text += ` │ ❏ UPTIME   : ${uptime} MIN\n`;
        text += ` │ ❏ MODE     : ${config.status.public ? 'PUBLIC' : 'PRIVATE'}\n`;
        text += ` ╰─ 𓄄 \`\`\`${time}\`\`\`\n\n`;

        // ── COMMANDS BY CATEGORY ──
        for (const [cat, cmds] of Object.entries(cats)) {
            text += `> ╭─❍ *${cat.toUpperCase()}*\n`;

            for (const cmd of cmds) {
                text += `> │ ➤ ${prefix}${cmd.name}\n`;
            }

            text += `> ╰──────────────────\n\n`;
        }

        // ── FOOTER ──
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
