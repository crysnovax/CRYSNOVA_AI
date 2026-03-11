const reminders = new Map();

module.exports = {
    name: 'remind',
    alias: ['reminder', 'alert'],
    category: 'tools',
    desc: 'Set a reminder: .remind <time> <message>',
    usage: '.remind 10m Take a break',
     // ⭐ Reaction config
    reactions: {
        start: '💬',
        success: '⏲️'
    },
    

    execute: async (sock, m, { args, reply, prefix }) => {
        if (args.length < 2) return reply(`Usage: ${prefix}remind <time> <message>\nExample: ${prefix}remind 10m Take a break`);

        const timeArg = args[0];
        const message = args.slice(1).join(' ');

        // Parse time: supports s, m, h
        const match = timeArg.match(/^(\d+)(s|m|h)$/);
        if (!match) return reply('Invalid time format. Use s, m, or h (e.g., 10m, 30s, 1h)');

        let ms = parseInt(match[1]);
        const unit = match[2];
        if (unit === 's') ms *= 1000;
        if (unit === 'm') ms *= 60 * 1000;
        if (unit === 'h') ms *= 60 * 60 * 1000;

        reply(`⏰ Reminder set for ${timeArg}: "${message}"`);

        const id = setTimeout(() => {
            sock.sendMessage(m.chat, { text: `⚉ Reminder: ${message}` }, { quoted: m });
            reminders.delete(id);
        }, ms);

        reminders.set(id, { user: m.sender, chat: m.chat, message });
    }
};