const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'timezones.json');

function getDB() {
    try { if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch {}
    return {};
}

const TIMEZONES = {
    'lagos': 'Africa/Lagos', 'london': 'Europe/London', 'new york': 'America/New_York',
    'tokyo': 'Asia/Tokyo', 'dubai': 'Asia/Dubai', 'paris': 'Europe/Paris'
};

function getTimezone(region) {
    const key = (region || '').toLowerCase().trim();
    return TIMEZONES[key] || region;
}

module.exports = {
    name: 'tmd',
    alias: ['timedefault', 'mytime', 'dt'],
    desc: 'Show time for your default region',
    category: 'Info',
    usage: '.tmd',
    reactions: { start: '⏰', success: '✨', error: '❔' },

    execute: async (sock, m, { reply, prefix }) => {
        const db = getDB();
        const userId = m.sender;
        const userDefault = db[userId];

        if (!userDefault) {
            return reply(
                `╭─❍ *DEFAULT TIME*\n│\n` +
                `│ ✘ No default region set!\n│\n` +
                `│ Set one: ${prefix}settmd <region>\n` +
                `│ Example: ${prefix}settmd Lagos\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '⏰', key: m.key } });

        try {
            const timezone = getTimezone(userDefault);
            const res = await axios.get(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`, { timeout: 8000 });
            const data = res.data;
            const datetime = new Date(data.datetime);
            const timeString = datetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const dateString = datetime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const regionName = data.timezone.split('/').pop().replace(/_/g, ' ');

            await sock.sendMessage(m.chat, {
                headerText: `## 🕐 My Time 🏠`,
                contentText: '---',
                title: `📊 ${regionName} *(Default)*`,
                table: [
                    ['⏰ Current Time', timeString],
                    ['📅 Date', dateString],
                    ['🌍 Timezone', data.timezone],
                    ['📊 UTC Offset', `UTC${data.utc_offset}`],
                    ['☀️ DST', data.dst ? 'Active 🥏' : 'Inactive 😴']
                ],
                footerText: '💡 Change: .settmd <region> | .tm for other cities'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ Failed to get time. Try .tm ${userDefault} instead.\``);
        }
    }
};
