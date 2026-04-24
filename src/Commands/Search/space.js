const axios = require('axios');

const SPACE_FACTS = [
    'The Sun is 400 times larger than the Moon but also 400 times farther away, making them appear the same size.',
    'A day on Venus is longer than a year on Venus.',
    'Neutron stars can spin 600 times per second.',
    'There are more stars in the universe than grains of sand on Earth.',
    'Olympus Mons on Mars is the tallest mountain in the solar system (21.9 km).',
    'Jupiter\'s Great Red Spot is a storm that has been raging for over 350 years.',
    'Saturn could float in water because it\'s mostly gas.',
    'The footprints on the Moon will stay for millions of years.'
];

module.exports = {
    name: 'space',
    alias: ['nasa', 'apod', 'astronomy'],
    desc: 'NASA Astronomy Picture of the Day & space facts',
    category: 'Search',
    usage: '.space or .space fact',
    reactions: { start: '📡', success: '🛰️', error: '🏗️' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const sub = args[0]?.toLowerCase();

        await sock.sendMessage(m.chat, { react: { text: '🚀', key: m.key } });

        try {
            // ── FACT ──────────────────────────────────────────────
            if (sub === 'fact') {
                const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];

                await sock.sendMessage(m.chat, {
                    headerText: `## 🚀 Space Fact`,
                    contentText: '---',
                    title: '🌌 Did You Know?',
                    table: [
                        ['📝 Fact', fact],
                        ['📡 Source', 'CRYSNOVA Space Knowledge']
                    ],
                    footerText: '💡 Use .space fact for another!'
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '📡', key: m.key } });
                return;
            }

            // ── APOD ──────────────────────────────────────────────
            const res = await axios.get('https://api.nasa.gov/planetary/apod', {
                params: { api_key: 'DEMO_KEY' },
                timeout: 10000
            });

            const data = res.data;

            await sock.sendMessage(m.chat, {
                headerText: `## 🚀 Astronomy Picture of the Day`,
                contentText: '---',
                title: `📅 ${data.date}`,
                table: [
                    ['📝 Title', data.title],
                    ['🌌 Explanation', (data.explanation || '').length > 500 ? data.explanation.slice(0, 497) + '...' : data.explanation],
                    ['📸 Credit', data.copyright || 'NASA'],
                    ['🌐 URL', data.url]
                ],
                footerText: '💡 NASA APOD • New picture every day!'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🛰️', key: m.key } });

        } catch (error) {
            await sock.sendMessage(m.chat, { react: { text: '🏗️', key: m.key } });
            reply('`✘ NASA API rate limited. Try .space fact instead.`');
        }
    }
};
