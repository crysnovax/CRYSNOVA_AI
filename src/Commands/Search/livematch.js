const axios = require('axios');

module.exports = {
    name: 'livematch',
    alias: ['live', 'match'],
    category: 'Sports',

    execute: async (sock, m, { args, reply }) => {
        try {
            const teamFilter = args.join(' ') || '';
            // Use your Worker URL, pass team filter as query param
            const url = `https://livematch.crysnovax.workers.dev/?team=${encodeURIComponent(teamFilter)}`;
            const res = await axios.get(url, {
                headers: { 'Accept': 'application/json' } // ensures JSON response
            });
            // Worker returns array directly, not { data: { matches: [...] } }
            const matches = res.data;

            if (!matches || matches.length === 0) {
                return reply(`_*ಥ⁠‿⁠ಥ No live matches found*_`);
            }

            let text = `⚽ *LIVE MATCHES*✐\n\n\n`;

            matches.forEach((match, i) => {
                text += `*𓊈𝑽꯭𝑰꯭𝑷ࠡࠡࠡࠡࠢ𓊉${i + 1}. ${match.team1} vs ${match.team2}*\n`;
                text += `𓄂ᬼ𓆃 League: ${match.league || 'N/A'}\n`;
                text += `❏◦◦◦◦◦◦Status: ${match.status || 'N/A'}\n`;
                text += `彡.... Score: ${match.score || '0 - 0'}\n`;
                if (match.time) text += `✧⋆⁩⁩⋆⁩⁩Time: ${match.time}\n`;
                text += `\n\n`;
            });

            await sock.sendMessage(m.chat, { text: text.trim() }, { quoted: m });

        } catch (err) {
            console.log(err);
            reply('_*ⓘ Failed to fetch live matches*_');
        }
    }
};
