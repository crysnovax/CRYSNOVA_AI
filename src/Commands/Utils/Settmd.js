const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'database', 'timezones.json');

function getDB() {
    try {
        if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch { return {}; }
}

function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

const TIMEZONES = {
    'lagos': 'Africa/Lagos', 'london': 'Europe/London', 'new york': 'America/New_York',
    'tokyo': 'Asia/Tokyo', 'dubai': 'Asia/Dubai', 'paris': 'Europe/Paris',
    'mumbai': 'Asia/Kolkata', 'sydney': 'Australia/Sydney', 'berlin': 'Europe/Berlin'
};

function getTimezone(region) {
    const key = region.toLowerCase().trim();
    return TIMEZONES[key] || region;
}

module.exports = {
    name: 'settmd',
    alias: ['settime', 'settimezone', 'st'],
    desc: 'Set your default timezone',
    category: 'Info',
    usage: 'settmd <region>',
    reactions: { start: '⏰', success: '🔖', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const region = args.join(' ').trim();
        
        if (!region) {
            const popular = Object.keys(TIMEZONES).slice(0, 8).map(r => r.charAt(0).toUpperCase() + r.slice(1));
            return reply(
                `╭─❍ *SET DEFAULT TIME*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}settmd <region>\n│\n` +
                `│ ✪ *Popular:*\n` +
                `│ ${popular.join(', ')}\n│\n` +
                `│ Then use .tmd anytime!\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '⏰', key: m.key } });

        const timezone = getTimezone(region);
        const userId = m.sender;

        try {
            const res = await axios.get(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`, { timeout: 8000 });
            const data = res.data;
            const datetime = new Date(data.datetime);
            const timeString = datetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const db = getDB();
            db[userId] = region;
            saveDB(db);

            await sock.sendMessage(m.chat, {
                headerText: `## ✨ Default Time Set`,
                contentText: '---',
                title: '⏰ Your Default Region',
                table: [
                    ['📍 Region', data.timezone.replace(/_/g, ' ')],
                    ['🕐 Current Time', timeString],
                    ['📊 UTC', `UTC${data.utc_offset}`],
                    ['📝 Usage', 'Use .tmd anytime!']
                ],
                footerText: '💡 .tmd shows your time instantly'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });

        } catch (err) {
            // Save even if API fails
            if (timezone) {
                const db = getDB();
                db[userId] = region;
                saveDB(db);

                await sock.sendMessage(m.chat, {
                    headerText: `## 📅 Default Time Set`,
                    contentText: '---',
                    title: '⏰ Offline Mode',
                    table: [
                        ['📍 Region', timezone.replace(/_/g, ' ')],
                        ['📝 Status', 'Saved (offline)'],
                        ['📝 Usage', 'Use .tmd anytime!']
                    ],
                    footerText: '💡 Will sync when API is available'
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } else {
                await sock.sendMessage(m.chat, { react: { text: '🏗️', key: m.key } });
                reply('`✘ Invalid region. Try: Lagos, London, Tokyo...`');
            }
        }
    }
};
