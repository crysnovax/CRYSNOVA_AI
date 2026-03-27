/**
 * .tm command - Show time for specific region
 * Usage: .tm <region> (e.g., .tm Lagos, .tm "New York")
 */

const { getTimezone, getPopularRegions, getTimeData } = require('../Core/®.js');

module.exports = {
    name: 'tm',
    alias: ['time', 'timezone'],
    category: 'Utility',
    desc: 'Show current time and date for a specific region',
    usage: '.tm <region> (e.g., .tm Lagos, .tm "New York")',
    
    reactions: {
        start: '⏰',
        success: '✅',
        error: '❌'
    },

    execute: async (sock, m, { args, reply }) => {
        const region = args.join(' ').trim();
        
        if (!region) {
            const popular = getPopularRegions();
            return reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ⚉ Usage: .tm <region>\n│\n` +
                `│ Examples:\n` +
                `│ • .tm Lagos\n` +
                `│ • .tm London\n` +
                `│ • .tm "New York"\n` +
                `│ • .tm Tokyo\n` +
                `│ • .tm Dubai\n│\n` +
                `│ Popular: ${popular.slice(0, 10).join(', ')}\n` +
                `╰────────────────`
            );
        }

        await reply('_⏰ Fetching time data..._');

        try {
            const timezone = getTimezone(region);
            
            if (!timezone) {
                return reply(
                    `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                    `│ ⚉ Unknown region: "${region}"\n│\n` +
                    `│ Try: Lagos, London, New York, Tokyo,\n` +
                    `│ Dubai, Paris, Berlin, Mumbai...\n` +
                    `╰────────────────`
                );
            }

            // Use the new getTimeData with retry and fallback
            const { source, data } = await getTimeData(timezone);
            console.log(`[TM] Data source: ${source}`);
            
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

            const dstStatus = data.dst ? '☀️ DST Active' : '🌙 Standard Time';
            const sourceNote = source !== 'worldtimeapi' ? `\n│ 📡 Source: ${source}` : '';

            await reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│\n` +
                `│ 📍 ${data.timezone.replace(/_/g, ' ')}\n` +
                `│\n` +
                `│ 🕐 ${timeString}\n` +
                `│ 📅 ${dateString}\n` +
                `│\n` +
                `│ 📊 UTC ${data.utc_offset}\n` +
                `│ 🏷️ ${data.abbreviation}\n` +
                `│ ${dstStatus}${sourceNote}\n` +
                `╰────────────────`
            );

        } catch (err) {
            console.error('[TM ERROR]', err.message);
            reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ⚉ Failed to get time\n│\n` +
                `│ ${err.message.substring(0, 100)}\n│\n` +
                `│ Try again in a moment.\n` +
                `╰────────────────`
            );
        }
    }
};
