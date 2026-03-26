// veepnnumbers.js - Get available numbers
module.exports = {
    name: 'vnumb',
    alias: ['vnums', 'numbers', 'vnumlist'],
    desc: 'List available Veepn virtual phone numbers',
    category: 'Tools',

    execute: async (sock, m, { args, reply }) => {
        try {
            const country = args[0]?.toUpperCase() || 'US';
            
            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = `https://apis.prexzyvilla.site/vnum/veepn-numbers?country=${encodeURIComponent(country)}`;
            
            const res = await fetch(apiUrl);
            if (!res.ok) return reply(`_*⚉ API failed for country ${country}*_`);

            const json = await res.json();

            if (!json.data || !json.data.length) {
                return reply(`_*亗 No numbers available for ${country}*_`);
            }

            const numbers = json.data.slice(0, 10);
            let list = numbers.map((num, i) => {
                const phone = num.number || num.phone || num.num;
                const country = num.country || num.region || 'Unknown';
                return `${i + 1}. *${phone}* (${country})`;
            }).join('\n');

            const message = `*⚉ VEEPN NUMBERS ⚉*
☬ Country: ${country}
📊 Available: ${json.data.length}

${list}

☬ Use: .veepnmsg <number> to get messages`;

            await reply(message);

        } catch (err) {
            console.error('[VEEPNNUMBERS ERROR]', err);
            reply('_*✘ Failed to fetch numbers*_');
        }
    }
};
