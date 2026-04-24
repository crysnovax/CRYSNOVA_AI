const axios = require('axios');

// Popular timezones mapping
const TIMEZONES = {
    'lagos': 'Africa/Lagos',
    'london': 'Europe/London',
    'new york': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'toronto': 'America/Toronto',
    'tokyo': 'Asia/Tokyo',
    'dubai': 'Asia/Dubai',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'mumbai': 'Asia/Kolkata',
    'delhi': 'Asia/Kolkata',
    'singapore': 'Asia/Singapore',
    'sydney': 'Australia/Sydney',
    'moscow': 'Europe/Moscow',
    'rio': 'America/Sao_Paulo',
    'beijing': 'Asia/Shanghai',
    'shanghai': 'Asia/Shanghai',
    'cairo': 'Africa/Cairo',
    'nairobi': 'Africa/Nairobi',
    'accra': 'Africa/Accra',
    'abuja': 'Africa/Lagos',
    'capetown': 'Africa/Johannesburg'
};

function getTimezone(region) {
    const key = region.toLowerCase().trim();
    if (TIMEZONES[key]) return TIMEZONES[key];
    return region; // Try as raw timezone
}

module.exports = {
    name: 'tm',
    alias: ['time', 'timezone', 'clock'],
    desc: 'Show current time for any region',
    category: 'Info',
    usage: '.tm <region>',
    reactions: { start: '⏰', success: '📅', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const region = args.join(' ').trim();
        
        if (!region) {
            const popular = Object.keys(TIMEZONES).slice(0, 10).map(r => r.charAt(0).toUpperCase() + r.slice(1));
            return reply(
                `╭─❍ *WORLD TIME*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}tm <region>\n│\n` +
                `│ ✪ *Popular:*\n` +
                `│ ${popular.join(', ')}\n│\n` +
                `│ 🌍 *Any city worldwide!*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '⏰', key: m.key } });

        try {
            const timezone = getTimezone(region);
            
            const response = await axios.get(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezone)}`, {
                timeout: 10000
            });

            const data = response.data;
            const datetime = new Date(data.datetime);
            
            const timeString = datetime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            const dateString = datetime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const regionName = data.timezone.split('/').pop().replace(/_/g, ' ');
            const gmtOffset = data.utc_offset;

            await sock.sendMessage(m.chat, {
                headerText: `## 🕐 ${regionName}`,
                contentText: '---',
                title: '📊 Time Details',
                table: [
                    ['⏰ Current Time', timeString],
                    ['📅 Date', dateString],
                    ['🌍 Timezone', data.timezone],
                    ['📊 UTC Offset', `UTC${gmtOffset}`],
                    ['🏷️ Abbreviation', data.abbreviation],
                    ['☀️ DST', data.dst ? 'Active 🎭' : 'Inactive 💤'],
                    ['📅 Day of Year', `Day ${data.day_of_year} / Week ${data.week_number}`]
                ],
                footerText: '💡 SWIPE ⇆ for details • Powered by CRYSNOVA AI'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '📅', key: m.key } });

        } catch (error) {
            console.error('[TM ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '🙊', key: m.key } });
            
            reply(
                `╭─❍ *WORLD TIME*\n│\n` +
                `│ ✘ *Region not found:* "${region}"\n│\n` +
                `│ Try: Lagos, London, New York, Tokyo,\n` +
                `│ Dubai, Paris, Berlin, Mumbai...\n` +
                `╰──────────────────`
            );
        }
    }
};
