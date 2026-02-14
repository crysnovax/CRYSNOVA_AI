const fs = require('fs');
const path = require('path');

const guardianFile = path.join(__dirname, '../database/guardian.json');
let guardian = { settings: {}, warnings: {}, spam: {} };

// Load guardian settings if exists
if (fs.existsSync(guardianFile)) {
    guardian = JSON.parse(fs.readFileSync(guardianFile));
}

module.exports = {
    command: 'guardian',
    alias: ['guard'],
    description: 'Set group guardian settings: antilink, antispam, or off',
    category: 'group',
    owner: true, // owner-only if needed

    execute: async (sock, m, { args, reply }) => {
        if (!m.isGroup) return reply('⚠ This command only works in groups');
        if (!args.length) return reply('Usage: .guardian <antilink|antispam|off>');

        const option = args[0].toLowerCase();
        if (!['antilink','antispam','off'].includes(option)) 
            return reply('Usage: .guardian <antilink|antispam|off>');

        guardian.settings[m.chat] = guardian.settings[m.chat] || {};
        if (option === 'off') {
            guardian.settings[m.chat] = {};
            reply('✅ Guardian disabled for this group');
        } else {
            guardian.settings[m.chat][option] = true;
            reply(`✅ ${option} enabled for this group`);
        }

        fs.writeFileSync(guardianFile, JSON.stringify(guardian, null, 2));
    },

    listener: async (sock, m) => {
        if (!m.isGroup) return;

        // Anti-Link
        if (guardian.settings[m.chat]?.antilink) {
            if (m.text && m.text.match(/https?:\/\/|chat\.whatsapp\.com/gi)) {
                await sock.sendMessage(m.chat, { delete: m.key }).catch(()=>{});

                const user = m.sender;
                guardian.warnings[user] = (guardian.warnings[user] || 0) + 1;

                await sock.sendMessage(m.chat, {
                    text: `⚠ Warning ${guardian.warnings[user]}/3`,
                    mentions: [user]
                });

                if (guardian.warnings[user] >= 3) {
                    await sock.groupParticipantsUpdate(m.chat, [user], 'remove').catch(()=>{});
                    guardian.warnings[user] = 0;
                }
            }
        }

        // Anti-Spam (5 messages in 5 seconds)
        if (guardian.settings[m.chat]?.antispam) {
            const now = Date.now();
            const user = m.sender;

            if (!guardian.spam[user]) guardian.spam[user] = [];
            guardian.spam[user].push(now);
            guardian.spam[user] = guardian.spam[user].filter(t => now - t < 5000);

            if (guardian.spam[user].length >= 5) {
                await sock.groupParticipantsUpdate(m.chat, [user], 'remove').catch(()=>{});
                guardian.spam[user] = [];
            }
        }
    }
};
