/**
 * .taxinfo — Tax deadlines and info with timezone support
 */

const { getUserTimezone, getTimeData } = require('../Core/®-utils');
const { getTimezone } = require('../Core/®.js');

// Tax deadlines by country/region (simplified)
const TAX_DEADLINES = {
    'Nigeria': { country: 'Nigeria', deadline: '2025-03-31', timezone: 'Africa/Lagos', currency: '₦', note: 'Companies Income Tax' },
    'USA': { country: 'United States', deadline: '2025-04-15', timezone: 'America/New_York', currency: '$', note: 'Federal Tax Day' },
    'UK': { country: 'United Kingdom', deadline: '2025-01-31', timezone: 'Europe/London', currency: '£', note: 'Self Assessment' },
    'Canada': { country: 'Canada', deadline: '2025-04-30', timezone: 'America/Toronto', currency: 'C$', note: 'Personal Tax' },
    'Australia': { country: 'Australia', deadline: '2024-10-31', timezone: 'Australia/Sydney', currency: 'A$', note: 'Tax Return Due' },
    'India': { country: 'India', deadline: '2024-07-31', timezone: 'Asia/Kolkata', currency: '₹', note: 'ITR Filing' },
    'Germany': { country: 'Germany', deadline: '2025-05-31', timezone: 'Europe/Berlin', currency: '€', note: 'Steuererklärung' },
    'France': { country: 'France', deadline: '2025-05-22', timezone: 'Europe/Paris', currency: '€', note: 'Déclaration' },
    'Japan': { country: 'Japan', deadline: '2025-03-15', timezone: 'Asia/Tokyo', currency: '¥', note: 'Kakutei Shinkoku' },
    'Brazil': { country: 'Brazil', deadline: '2025-04-30', timezone: 'America/Sao_Paulo', currency: 'R$', note: 'Imposto de Renda' },
    'South Africa': { country: 'South Africa', deadline: '2024-11-29', timezone: 'Africa/Johannesburg', currency: 'R', note: 'Provisional Tax' },
    'UAE': { country: 'UAE', deadline: '2024-12-31', timezone: 'Asia/Dubai', currency: 'AED', note: 'Corporate Tax' }
};

// Map regions to countries for smart detection
const REGION_TO_COUNTRY = {
    'lagos': 'Nigeria',
    'nigeria': 'Nigeria',
    'abuja': 'Nigeria',
    'new_york': 'USA',
    'los_angeles': 'USA',
    'chicago': 'USA',
    'london': 'UK',
    'manchester': 'UK',
    'toronto': 'Canada',
    'vancouver': 'Canada',
    'sydney': 'Australia',
    'melbourne': 'Australia',
    'mumbai': 'India',
    'delhi': 'India',
    'bangalore': 'India',
    'berlin': 'Germany',
    'munich': 'Germany',
    'paris': 'France',
    'lyon': 'France',
    'tokyo': 'Japan',
    'osaka': 'Japan',
    'sao_paulo': 'Brazil',
    'rio': 'Brazil',
    'johannesburg': 'South Africa',
    'cape_town': 'South Africa',
    'dubai': 'UAE',
    'abu_dhabi': 'UAE'
};

const getDaysUntil = (deadline, timezone) => {
    const deadlineDate = new Date(deadline + 'T23:59:59');
    const now = new Date();
    
    // Convert both to timezone
    const deadlineLocal = new Date(deadlineDate.toLocaleString('en-US', { timeZone: timezone }));
    const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const diffMs = deadlineLocal - nowLocal;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
};

const formatDeadlineStatus = (days) => {
    if (days < 0) return { text: '⚠️ OVERDUE', emoji: '🔴' };
    if (days === 0) return { text: '🚨 DUE TODAY', emoji: '🔴' };
    if (days <= 7) return { text: `⏰ ${days} days left`, emoji: '🟠' };
    if (days <= 30) return { text: `📅 ${days} days left`, emoji: '🟡' };
    return { text: `✅ ${days} days left`, emoji: '🟢' };
};

module.exports = {
    name: 'taxinfo',
    alias: ['tax', 'deadline', 'irs'],
    desc: 'Tax deadlines in your timezone',
    category: 'Finance',
    usage: '.taxinfo [country] (auto-detects from your timezone)',
    
    reactions: { start: '📊', success: '💰', urgent: '🚨' },

    execute: async (sock, m, { args, reply }) => {
        try {
            const userId = m.sender || m.key?.participant || m.key?.remoteJid;
            const userRegion = getUserTimezone(userId);
            const userTimezone = getTimezone(userRegion) || 'Africa/Lagos';
            
            const { data } = await getTimeData(userTimezone);
            const now = new Date(data.datetime);
            
            // Determine country
            let country = args.join(' ');
            if (!country) {
                // Auto-detect from user's timezone region
                const regionKey = userRegion.toLowerCase().replace(/\s+/g, '_');
                country = REGION_TO_COUNTRY[regionKey];
            }
            
            if (!country || !TAX_DEADLINES[country]) {
                // Show all available
                let response = `╭─❍ *TAX INFO* 📊\n`;
                response += `│ 📍 Your region: ${userRegion}\n`;
                response += `│\n`;
                response += `│ ⚉ Could not auto-detect country\n`;
                response += `│\n`;
                response += `│ Available countries:\n`;
                response += `│ ${Object.keys(TAX_DEADLINES).join(', ')}\n`;
                response += `│\n`;
                response += `│ Use: .taxinfo <country>\n`;
                response += `╰────────────────`;
                return reply(response);
            }
            
            const tax = TAX_DEADLINES[country];
            const daysLeft = getDaysUntil(tax.deadline, tax.timezone);
            const status = formatDeadlineStatus(daysLeft);
            
            // Convert deadline to user's timezone
            const deadlineDate = new Date(tax.deadline + 'T23:59:59');
            const userDeadline = new Date(deadlineDate.toLocaleString('en-US', { timeZone: userTimezone }));
            
            // FIX: Use proper string concatenation or single template literal
            const formattedDate = userDeadline.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const response = 
                `╭─❍ *TAX INFO* ${status.emoji}\n` +
                `│\n` +
                `│ 🏛️ ${tax.country}\n` +
                `│ 📝 ${tax.note}\n` +
                `│\n` +
                `│ 📅 Deadline: ${formattedDate}\n` +
                `│ 🕐 11:59 PM ${userRegion} time\n` +
                `│\n` +
                `│ ${status.text}\n` +
                `│ 💵 Currency: ${tax.currency}\n` +
                `│\n` +
                `│ 💡 Tip: File early to avoid penalties!\n` +
                `╰────────────────`;
            
            await reply(response);
            
        } catch (err) {
            console.error('[TAXINFO ERROR]', err);
            reply('⚉ Failed to fetch tax info');
        }
    }
};
