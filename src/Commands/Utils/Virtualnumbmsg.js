// veepnmsg.js - Get messages for a number
module.exports = {
    name: 'vnumbmsg',
    alias: ['vmsg', 'sms', 'getmsg'],
    desc: 'Get SMS messages for a Veepn virtual number',
    category: 'Tools',

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args.length) {
                return reply(`📩 Usage:
.veepnmsg <number>
.veepnmsg +1234567890

☬ Get numbers from .veepnnumbers`);
            }

            const number = args[0].trim();
            const country = args[1]?.toUpperCase() || 'US';
            const page = args[2] || '1';
            const count = args[3] || '10';

            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = `https://apis.prexzyvilla.site/vnum/veepn-messages?country=${encodeURIComponent(country)}&number=${encodeURIComponent(number)}&page=${page}&count=${count}`;

            const res = await fetch(apiUrl);
            if (!res.ok) return reply('_*⚉ Failed to fetch messages*_');

            const json = await res.json();

            if (!json.data || !json.data.length) {
                return reply(`_*亗 No messages for ${number}*_`);
            }

            const messages = json.data.slice(0, 5);
            let msgList = messages.map((msg, i) => {
                const from = msg.from || msg.sender || 'Unknown';
                const text = msg.text || msg.message || msg.body || 'No content';
                const time = msg.time || msg.date || 'Unknown time';
                return `*${i + 1}. From:* ${from}\n📝 ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n⏰ ${time}\n`;
            }).join('\n');

            const message = `*⚉ MESSAGES FOR ${number} ⚉*
☬ Country: ${country}
📨 Total: ${json.data.length}

${msgList}

☬ Use .veepnnumbers to see available numbers`;

            await reply(message);

        } catch (err) {
            console.error('[VEEPNMSG ERROR]', err);
            reply('_*✘ Failed to get messages*_');
        }
    }
};
