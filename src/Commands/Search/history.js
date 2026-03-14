const axios = require('axios');

module.exports = {
    name: 'history',
    alias: ['today', 'onthisday', 'hist'],
    category: 'tools',
    desc: 'Get historical events for a specific date (MM/DD)',
    execute: async (conn, m, { args, reply }) => {
        try {
            let month, day;

            if (args[0] && args[0].includes('/')) {
                const splitDate = args[0].split('/');
                month = splitDate[0].padStart(2, '0'); // Ensures '1' becomes '01'
                day = splitDate[1].padStart(2, '0');
            } else {
                const today = new Date();
                month = String(today.getMonth() + 1).padStart(2, '0');
                day = String(today.getDate()).padStart(2, '0');
            }

            // Validation
            if (parseInt(month) > 12 || parseInt(day) > 31) {
                return reply('✘ _*Format Error: Use MM/DD (Max 12/31)*_');
            }

            reply(` _*✦ RETRIEVING INFO${month}/${day}...*_`);

            // Added Headers to prevent "Access Denied"
            const response = await axios.get(
                `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`,
                {
                    headers: {
                        'User-Agent': 'CodexBot/2.0 (https://github.com/DEV-CODEXAI; codex@example.com) Axios/1.6.0'
                    }
                }
            );
            
            if (!response.data || !response.data.events || response.data.events.length === 0) {
                return reply('✘ _*Codex Archive Error: No data found for this sector.*_');
            }

            const events = response.data.events;
            const selected = events.sort(() => 0.5 - Math.random()).slice(0, 3);

            let resultMsg = ` _*✦ HISTORICAL INTEL*_\n`;
            resultMsg += `📅 *Target Date:* ${month}/${day}\n\n`;

            selected.forEach((ev, index) => {
                resultMsg += `${index + 1}. *Year ${ev.year}:* ${ev.text}\n\n`;
            });

            resultMsg += `*RETRIEVED VIA CRYSNOVA AI*`;

            reply(resultMsg);

        } catch (error) {
            console.error(error);
            // Detailed error feedback
            const reason = error.response ? `Status ${error.response.status}` : "Network Timeout";
            reply(`✘ _*History Core Error: ${reason}*_`);
        }
    }
};
