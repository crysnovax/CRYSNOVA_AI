const { getByCategory } = require('../../Plugin/crysCmd');
const { getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'menu',
    alias: ['help', 'list'],
    desc: 'Show all commands',
    category: 'Bot',
    execute: async (sock, m, { prefix, config }) => {
        const cats = getByCategory();
        const botName = getVar('botName', config.settings.title);
        const uptime = Math.floor((Date.now() - global.crysStats.startTime) / 60000);

        let text = `╔══════════════════════════╗\n`;
        text += `║  ${botName}\n`;
        text += `╚══════════════════════════╝\n\n`;
        text += `> ❏┃ Prefix: *[${prefix}]*\n`;
        text += `> ❏┃ Commands: *${[...require('../../Plugin/crysCmd').getAll().keys()].filter(k => !require('../../Plugin/crysCmd').getAll().get(k).isAlias).length}*\n`;
        text += `> ❏┃ Uptime: *${uptime}m*\n`;
        text += `> ❏┃ Mode: *${config.status.public ? 'Public' : 'Private'}*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const [cat, cmds] of Object.entries(cats)) {
            text += `> ━━〔 *${cat.toUpperCase()}* 〕━━\n`;
            for (const cmd of cmds) {
                text += `> ❏┃ ${prefix}${cmd.name}${cmd.desc ? ` - ${cmd.desc}` : ''}\n`;
            }
            text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        }

        await sock.sendMessage(m.chat, {
            image: { url: config.thumbUrl },
            caption: text
        }, { quoted: m });
    }
};
