/**
 * .tmd command - Show time for user's default region
 * Usage: .tmd (no arguments)
 */

const fs = require('fs');
const path = require('path');
const { getTimezone, getTimeData } = require('../Core/®.js');

const DB_PATH = path.join(__dirname, '../../database/timezones.json');

const getDB = () => {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
};

module.exports = {
    name: 'tmd',
    alias: ['timedefault', 'mytime', 'dt'],
    category: 'Utility',
    desc: 'Show current time for your default region',
    usage: '.tmd (no arguments needed)',
    
    reactions: {
        start: '⏰',
        success: '✅',
        error: '❌'
    },

    execute: async (sock, m, { reply }) => {
        const db = getDB();
        const userId = m.sender || m.key?.participant || m.key?.remoteJid;
        
        const userDefault = db[userId];
        
        if (!userDefault) {
            return reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ⚉ No default region set!\n│\n` +
                `│ Use: .settmd <region>\n` +
                `│ Example: .settmd Lagos\n│\n` +
                `│ Then use .tmd anytime!\n` +
                `╰────────────────`
            );
        }

        await reply(`_⏰ Getting time for ${userDefault}..._`);

        try {
            const timezone = getTimezone(userDefault);
            
            if (!timezone) {
                return reply(`⚉ Saved region "${userDefault}" is no longer valid. Use .settmd to set a new one.`);
            }

            const { source, data } = await getTimeData(timezone);
            console.log(`[TMD] Data source: ${source}`);
            
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
            const sourceNote = source !== 'worldtimeapi' ? `\n│ 📡 ${source}` : '';

            await reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤 🏠\n` +
                `│\n` +
                `│ 📍 ${data.timezone.replace(/_/g, ' ')} *(Default)*\n` +
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
            console.error('[TMD ERROR]', err.message);
            reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ⚉ Failed to get time\n│\n` +
                `│ ${err.message.substring(0, 100)}\n│\n` +
                `│ API might be down. Try .tm <region> instead.\n` +
                `╰────────────────`
            );
        }
    }
};
