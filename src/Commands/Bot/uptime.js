// src/Commands/Bot/uptime.js — Bot uptime with correct time calculation
const axios = require('axios');

// Store start time when module loads
const BOT_START_TIME = Date.now();

// Get current time from Google (stable, free, no auth needed)
async function getServerTime() {
    try {
        const res = await axios.get('https://www.google.com', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        // Parse from response headers: Date header contains current server time
        const dateHeader = res.headers['date'];
        if (dateHeader) {
            return new Date(dateHeader).getTime();
        }
    } catch (e) {
        // Fallback to local time if Google fails
    }
    return Date.now();
}

// Format milliseconds to human-readable uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const displayDays = days;
    const displayHours = hours % 24;
    const displayMinutes = minutes % 60;
    const displaySeconds = seconds % 60;
    
    return {
        days: displayDays,
        hours: displayHours,
        minutes: displayMinutes,
        seconds: displaySeconds,
        formatted: `${displayDays}d ${displayHours}h ${displayMinutes}m ${displaySeconds}s`
    };
}

module.exports = {
    name: 'uptime',
    alias: ['stats', 'botuptime'],
    desc: 'Show bot uptime and server stats',
    category: 'Bot',
    reactions: { start: '⏱️', success: '✅' },

    execute: async (sock, m, { reply }) => {
        try {
            // Get current server time (fixes timezone-dependent off-by-1 hour bug)
            const currentTime = await getServerTime();
            const uptimeMs = currentTime - BOT_START_TIME;
            const uptime = formatUptime(uptimeMs);
            
            // Get process memory
            const memUsage = process.memoryUsage();
            const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
            const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            // Format response
            const uptimeText = `${uptime.days}d ${uptime.hours}h ${uptime.minutes}m ${uptime.seconds}s`;
            const memoryText = `${heapUsedMB}MB / ${heapTotalMB}MB`;
            
            reply(
                `╭─❍ *BOT STATUS*\n` +
                `│\n` +
                `│ ⏱️ Uptime: ${uptimeText}\n` +
                `│ 📊 Memory: ${memoryText}\n` +
                `│ ✓ Status: Online\n` +
                `│\n` +
                `╰──────────────────`
            );
        } catch (err) {
            console.error('[UPTIME ERROR]', err.message);
            reply('╭─❍ *ERROR*\n│ ❌ Failed to get uptime\n╰──────────────────');
        }
    }
};
