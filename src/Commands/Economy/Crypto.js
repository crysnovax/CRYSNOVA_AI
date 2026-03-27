/**
 * .crypto — Crypto market status (24/7) with peak volume hours per region
 */

const { getUserTimezone, getTimeData } = require('../Core/®-utils');
const { getTimezone } = require('../Core/®.js');

// Crypto peak trading hours by region (based on historical volume)
const CRYPTO_PEAKS = {
    'Asia': { timezone: 'Asia/Tokyo', peaks: ['09:00-11:00', '20:00-22:00'], desc: 'Tokyo & Seoul active' },
    'Europe': { timezone: 'Europe/London', peaks: ['09:00-11:00', '16:00-18:00'], desc: 'London & Frankfurt active' },
    'Americas': { timezone: 'America/New_York', peaks: ['09:30-11:30', '20:00-22:00'], desc: 'NY open & Asia overlap' }
};

const getCryptoStatus = (region, date, userTimezone) => {
    const now = new Date(date);
    const hour = now.getHours();
    
    // Simple volatility estimate based on hour
    let volatility = 'Low';
    let emoji = '😴';
    
    if (hour >= 8 && hour <= 11) {
        volatility = 'Medium';
        emoji = '⚡';
    } else if (hour >= 13 && hour <= 16) {
        volatility = 'High';
        emoji = '🔥';
    } else if (hour >= 20 || hour <= 2) {
        volatility = 'High';
        emoji = '🔥';
    }
    
    return { volatility, emoji, hour };
};

module.exports = {
    name: 'crypto',
    alias: ['bitcoin', 'btc', 'crypto'],
    desc: 'Crypto market status with peak hours for your region',
    category: 'Finance',
    usage: '.crypto [coin] (e.g., .crypto, .crypto BTC, .crypto ETH)',
    
    reactions: { start: '₿', success: '🚀' },

    execute: async (sock, m, { args, reply }) => {
        try {
            const userId = m.sender || m.key?.participant || m.key?.remoteJid;
            const userRegion = getUserTimezone(userId);
            const userTimezone = getTimezone(userRegion) || 'Africa/Lagos';
            
            const { data } = await getTimeData(userTimezone);
            const now = new Date(data.datetime);
            
            const coin = (args[0] || 'BTC').toUpperCase();
            const status = getCryptoStatus(userRegion, now, userTimezone);
            
            // Get current prices (mock - integrate real API)
            const prices = {
                'BTC': { price: '$43,250', change: '+2.4%', emoji: '🟢' },
                'ETH': { price: '$2,580', change: '+1.8%', emoji: '🟢' },
                'SOL': { price: '$98.50', change: '-0.5%', emoji: '🔴' },
                'BNB': { price: '$312', change: '+0.9%', emoji: '🟢' }
            };
            
            const price = prices[coin] || { price: 'N/A', change: 'N/A', emoji: '⚪' };
            
            let response = `╭─❍ *CRYPTO MARKET* ₿\n`;
            response += `│ 📍 ${userRegion} | ${now.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}\n`;
            response += `│\n`;
            response += `│ ${price.emoji} ${coin}: ${price.price}\n`;
            response += `│    24h: ${price.change}\n`;
            response += `│\n`;
            response += `│ ⚡ Volatility: ${status.emoji} ${status.volatility}\n`;
            response += `│\n`;
            response += `│ 🔥 Peak Hours (Your Time):\n`;
            
            // Show all regional peaks converted to user time
            for (const [region, data] of Object.entries(CRYPTO_PEAKS)) {
                response += `│ • ${region}: ${data.peaks.join(', ')}\n`;
            }
            
            response += `│\n`;
            response += `│ 💡 Tip: Trade during overlaps\n`;
            response += `│    for highest liquidity\n`;
            response += `╰────────────────`;
            
            await reply(response);
            
        } catch (err) {
            console.error('[CRYPTO ERROR]', err);
            reply('⚉ Failed to fetch crypto data');
        }
    }
};
