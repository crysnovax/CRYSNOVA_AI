/**
 * .settmd command - Set default region for time display
 * Usage: .settmd <region> (e.g., .settmd Lagos)
 */

const fs = require('fs');
const path = require('path');
const { getTimezone, getPopularRegions, getTimeData } = require('../Core/®.js');

const DB_PATH = path.join(__dirname, '../../database/timezones.json');

const getDB = () => {
    if (!fs.existsSync(path.dirname(DB_PATH))) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, '{}');
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
};

const saveDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'settmd',
    alias: ['settime', 'settimezone', 'st'],
    category: 'Utility',
    desc: 'Set your default region for time display',
    usage: '.settmd <region> (e.g., .settmd Lagos)',
    
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
                `│ ⚉ Usage: .settmd <region>\n│\n` +
                `│ This sets your default timezone.\n` +
                `│ Then use .tmd to check time instantly.\n│\n` +
                `│ Examples:\n` +
                `│ • .settmd Lagos\n` +
                `│ • .settmd London\n` +
                `│ • .settmd "New York"\n│\n` +
                `│ Popular: ${popular.slice(0, 8).join(', ')}\n` +
                `╰────────────────`
            );
        }

        await reply(`_⏰ Verifying "${region}"..._`);

        try {
            const timezone = getTimezone(region);
            
            if (!timezone) {
                return reply(
                    `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                    `│ ⚉ Invalid region: "${region}"\n│\n` +
                    `│ Try common names like:\n` +
                    `│ Lagos, London, Dubai, Tokyo,\n` +
                    `│ New York, Paris, Mumbai...\n` +
                    `╰────────────────`
                );
            }

            // Verify with retry and fallback
            const { source, data } = await getTimeData(timezone);
            console.log(`[SETTMD] Verified via: ${source}`);
            
            const datetime = new Date(data.datetime);
            const timeString = datetime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });

            // Save to database
            const db = getDB();
            const userId = m.sender || m.key?.participant || m.key?.remoteJid;
            
            db[userId] = region;
            saveDB(db);

            const sourceNote = source !== 'worldtimeapi' ? `\n│ 📡 Verified via: ${source}` : '';

            await reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ✅ Default region set!\n│\n` +
                `│ 📍 ${data.timezone.replace(/_/g, ' ')}\n` +
                `│ 🕐 ${timeString}${sourceNote}\n│\n` +
                `│ Use .tmd anytime to check.\n` +
                `╰────────────────`
            );

        } catch (err) {
            console.error('[SETTMD ERROR]', err.message);
            
            // Even if API fails, allow setting if region is valid
            const timezone = getTimezone(region);
            if (timezone) {
                const db = getDB();
                const userId = m.sender || m.key?.participant || m.key?.remoteJid;
                db[userId] = region;
                saveDB(db);
                
                return reply(
                    `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                    `│ ✅ Default region set (offline mode)\n│\n` +
                    `│ 📍 ${timezone.replace(/_/g, ' ')}\n│\n` +
                    `│ ⚠️ Couldn't verify with API\n` +
                    `│ Will sync when online.\n│\n` +
                    `│ Use .tmd to check time.\n` +
                    `╰────────────────`
                );
            }
            
            reply(
                `╭─❍ *CRYSNOVA TIME* 𓉤\n` +
                `│ ⚉ Failed to verify region\n│\n` +
                `│ ${err.message.substring(0, 100)}\n│\n` +
                `│ Try again later or check spelling.\n` +
                `╰────────────────`
            );
        }
    }
};
