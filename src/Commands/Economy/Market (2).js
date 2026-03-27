/**
 * .market — Stock market status (open/closed) based on user's timezone
 */

const { getUserTimezone, getTimeData } = require('../Core/®-utils');
const { getTimezone } = require('../Core/®.js');

// Major stock exchanges with their timezones and hours
const STOCK_EXCHANGES = {
    'NYSE': { name: 'New York Stock Exchange', timezone: 'America/New_York', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] },
    'NASDAQ': { name: 'NASDAQ', timezone: 'America/New_York', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] },
    'LSE': { name: 'London Stock Exchange', timezone: 'Europe/London', open: '08:00', close: '16:30', days: [1, 2, 3, 4, 5] },
    'TSE': { name: 'Tokyo Stock Exchange', timezone: 'Asia/Tokyo', open: '09:00', close: '15:00', days: [1, 2, 3, 4, 5] },
    'SSE': { name: 'Shanghai Stock Exchange', timezone: 'Asia/Shanghai', open: '09:30', close: '15:00', days: [1, 2, 3, 4, 5] },
    'HKEX': { name: 'Hong Kong Stock Exchange', timezone: 'Asia/Hong_Kong', open: '09:30', close: '16:00', days: [1, 2, 3, 4, 5] },
    'BSE': { name: 'Bombay Stock Exchange', timezone: 'Asia/Kolkata', open: '09:15', close: '15:30', days: [1, 2, 3, 4, 5] },
    'NSE': { name: 'National Stock Exchange (India)', timezone: 'Asia/Kolkata', open: '09:15', close: '15:30', days: [1, 2, 3, 4, 5] },
    'FWB': { name: 'Frankfurt Stock Exchange', timezone: 'Europe/Berlin', open: '08:00', close: '20:00', days: [1, 2, 3, 4, 5] },
    'Euronext': { name: 'Euronext Paris', timezone: 'Europe/Paris', open: '09:00', close: '17:30', days: [1, 2, 3, 4, 5] },
    'ASX': { name: 'Australian Securities Exchange', timezone: 'Australia/Sydney', open: '10:00', close: '16:00', days: [1, 2, 3, 4, 5] },
    'JSE': { name: 'Johannesburg Stock Exchange', timezone: 'Africa/Johannesburg', open: '09:00', close: '17:00', days: [1, 2, 3, 4, 5] },
    'NSE_Nigeria': { name: 'Nigerian Stock Exchange', timezone: 'Africa/Lagos', open: '10:00', close: '14:00', days: [1, 2, 3, 4, 5] },
    'B3': { name: 'B3 (Brazil)', timezone: 'America/Sao_Paulo', open: '10:00', close: '17:00', days: [1, 2, 3, 4, 5] },
    'BMV': { name: 'Mexican Stock Exchange', timezone: 'America/Mexico_City', open: '08:30', close: '15:00', days: [1, 2, 3, 4, 5] }
};

const isMarketOpen = (exchange, date, userTimezone) => {
    const now = new Date(date);
    const day = now.getDay();
    
    // Check if trading day
    if (!exchange.days.includes(day)) return { open: false, reason: 'Weekend' };
    
    // Convert exchange hours to user's timezone
    const [openHour, openMin] = exchange.open.split(':').map(Number);
    const [closeHour, closeMin] = exchange.close.split(':').map(Number);
    
    // Create dates for open and close in exchange timezone
    const openTime = new Date(now.toLocaleString('en-US', { timeZone: exchange.timezone }));
    openTime.setHours(openHour, openMin, 0, 0);
    
    const closeTime = new Date(now.toLocaleString('en-US', { timeZone: exchange.timezone }));
    closeTime.setHours(closeHour, closeMin, 0, 0);
    
    // Convert to user's timezone for display
    const userOpen = new Date(openTime.toLocaleString('en-US', { timeZone: userTimezone }));
    const userClose = new Date(closeTime.toLocaleString('en-US', { timeZone: userTimezone }));
    
    const currentTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    
    const isOpen = currentTime >= userOpen && currentTime <= userClose;
    
    return {
        open: isOpen,
        openTime: userOpen.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        closeTime: userClose.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        reason: isOpen ? 'Trading' : (currentTime < userOpen ? 'Opens soon' : 'Closed')
    };
};

module.exports = {
    name: 'market',
    alias: ['stocks', 'exchange'],
    desc: 'Check stock market status in your timezone',
    category: 'Finance',
    usage: '.market [exchange] (e.g., .market, .market NYSE, .market LSE)',
    
    reactions: { start: '📈', success: '💹', closed: '📉' },

    execute: async (sock, m, { args, reply }) => {
        try {
            const userId = m.sender || m.key?.participant || m.key?.remoteJid;
            const userRegion = getUserTimezone(userId);
            const userTimezone = getTimezone(userRegion) || 'Africa/Lagos';
            
            const { data } = await getTimeData(userTimezone);
            const now = new Date(data.datetime);
            
            // If specific exchange requested
            const requested = args[0]?.toUpperCase();
            if (requested && STOCK_EXCHANGES[requested]) {
                const ex = STOCK_EXCHANGES[requested];
                const status = isMarketOpen(ex, now, userTimezone);
                
                const emoji = status.open ? '💹' : '📉';
                const statusText = status.open ? '🔵 OPEN' : '🔴 CLOSED';
                
                return reply(
                    `╭─❍ *${ex.name}* ${emoji}\n` +
                    `│\n` +
                    `│ Status: ${statusText}\n` +
                    `│ Reason: ${status.reason}\n` +
                    `│\n` +
                    `│ 🕐 Open: ${status.openTime}\n` +
                    `│ 🕐 Close: ${status.closeTime}\n` +
                    `│ 📍 Your Time (${userRegion})\n` +
                    `╰────────────────`
                );
            }
            
            // Show all major markets
            let response = `╭─❍ *STOCK MARKETS* 📈\n│ 📍 ${userRegion} Time\n│\n`;
            
            const markets = ['NYSE', 'LSE', 'TSE', 'SSE', 'NSE', 'JSE', 'NSE_Nigeria'];
            
            for (const key of markets) {
                const ex = STOCK_EXCHANGES[key];
                const status = isMarketOpen(ex, now, userTimezone);
                const emoji = status.open ? '🟢' : '🔴';
                
                response += `│ ${emoji} ${key}: ${status.openTime}-${status.closeTime}\n`;
            }
            
            response += `│\n│ Use: .market <code> for details\n│ Codes: NYSE, LSE, TSE, NSE...\n╰────────────────`;
            
            await reply(response);
            
        } catch (err) {
            console.error('[MARKET ERROR]', err);
            reply('⚉ Failed to fetch market data');
        }
    }
};
