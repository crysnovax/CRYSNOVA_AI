/**
 * .forex — Forex market hours in user's timezone
 * Forex is 24h but has 3 major sessions: Tokyo, London, New York
 */

const { getUserTimezone, getTimeData } = require('../Core/®-utils');
const { getTimezone } = require('../Core/®.js');

const FOREX_SESSIONS = {
    'Sydney': { timezone: 'Australia/Sydney', open: '22:00', close: '07:00', city: 'Sydney' },
    'Tokyo': { timezone: 'Asia/Tokyo', open: '00:00', close: '09:00', city: 'Tokyo' },
    'London': { timezone: 'Europe/London', open: '08:00', close: '17:00', city: 'London' },
    'New York': { timezone: 'America/New_York', open: '13:00', close: '22:00', city: 'New York' }
};

const getSessionStatus = (session, date, userTimezone) => {
    const now = new Date(date);
    
    // Parse session times (in session's local timezone)
    const [openHour, openMin] = session.open.split(':').map(Number);
    const [closeHour, closeMin] = session.close.split(':').map(Number);
    
    // Create times in session timezone
    const sessionTime = new Date(now.toLocaleString('en-US', { timeZone: session.timezone }));
    
    let openTime = new Date(sessionTime);
    openTime.setHours(openHour, openMin, 0, 0);
    
    let closeTime = new Date(sessionTime);
    closeTime.setHours(closeHour, closeMin, 0, 0);
    
    // Handle sessions that cross midnight (Sydney, Tokyo)
    if (closeTime <= openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
    }
    
    // Convert to user's timezone
    const userOpen = new Date(openTime.toLocaleString('en-US', { timeZone: userTimezone }));
    const userClose = new Date(closeTime.toLocaleString('en-US', { timeZone: userTimezone }));
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    
    const isActive = userNow >= userOpen && userNow <= userClose;
    const isOverlap = (userNow >= userOpen && userNow <= new Date(userOpen.getTime() + 2 * 60 * 60 * 1000)) ||
                      (userNow <= userClose && userNow >= new Date(userClose.getTime() - 2 * 60 * 60 * 1000));
    
    return {
        active: isActive,
        overlap: isOverlap,
        openTime: userOpen.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        closeTime: userClose.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        nextOpen: !isActive ? userOpen.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null
    };
};

module.exports = {
    name: 'forex',
    alias: ['fx', 'currency'],
    desc: 'Forex market sessions in your timezone',
    category: 'Finance',
    usage: '.forex',
    
    reactions: { start: '💱', success: '💰' },

    execute: async (sock, m, { reply }) => {
        try {
            const userId = m.sender || m.key?.participant || m.key?.remoteJid;
            const userRegion = getUserTimezone(userId);
            const userTimezone = getTimezone(userRegion) || 'Africa/Lagos';
            
            const { data } = await getTimeData(userTimezone);
            const now = new Date(data.datetime);
            
            let response = `╭─❍ *FOREX MARKET* 💱\n│ 📍 ${userRegion} Time\n│\n`;
            
            let activeCount = 0;
            
            for (const [name, session] of Object.entries(FOREX_SESSIONS)) {
                const status = getSessionStatus(session, now, userTimezone);
                
                let emoji = '⚪';
                let note = '';
                
                if (status.active) {
                    emoji = '🟢';
                    activeCount++;
                    if (status.overlap) {
                        emoji = '💰';
                        note = ' [PEAK]';
                    }
                } else if (status.nextOpen) {
                    emoji = '🔴';
                    note = ` → ${status.nextOpen}`;
                }
                
                response += `│ ${emoji} ${name}: ${status.openTime}-${status.closeTime}${note}\n`;
            }
            
            // Best trading times
            response += `│\n│ 💡 Best Times:\n`;
            if (activeCount >= 2) {
                response += `│ 🔥 HIGH VOLATILITY\n│ Multiple sessions active!\n`;
            } else if (activeCount === 1) {
                response += `│ ⚡ Moderate activity\n│ Wait for overlap for best spreads\n`;
            } else {
                response += `│ 😴 Low activity\n│ Wait for London/NY open\n`;
            }
            
            response += `╰────────────────`;
            
            await reply(response);
            
        } catch (err) {
            console.error('[FOREX ERROR]', err);
            reply('⚉ Failed to fetch forex data');
        }
    }
};
