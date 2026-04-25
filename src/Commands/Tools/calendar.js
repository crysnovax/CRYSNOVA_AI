module.exports = {
    name: 'calendar',
    alias: ['cal', 'month', 'kalendar'],
    desc: 'Display a monthly calendar',
    category: 'Tools',
    usage: '.calendar [month] [year]',
    reactions: { start: '📅', success: '🔖', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const today = new Date();
        let month = parseInt(args[0]) || today.getMonth() + 1;
        let year = parseInt(args[1]) || today.getFullYear();

        // Validate month
        if (month < 1 || month > 12) {
            month = today.getMonth() + 1;
            year = today.getFullYear();
        }

        if (!args[0] && !args[1]) {
            return reply(
                `╭─❍ *CALENDAR*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}calendar [month] [year]\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}calendar → Current month\n` +
                `│ ${prefix}calendar 12 → December\n` +
                `│ ${prefix}calendar 1 2027 → January 2027\n` +
                `│ ${prefix}calendar 12 2026\n│\n` +
                `│ 📅 *Monthly calendar view*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '📅', key: m.key } });

        try {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const monthName = monthNames[month - 1];

            // Get first day of month and total days
            const firstDay = new Date(year, month - 1, 1).getDay();
            const totalDays = new Date(year, month, 0).getDate();

            // Build calendar grid
            let calendarGrid = '';
            
            // Day headers
            calendarGrid += dayNames.map(d => `*${d}*`).join(' │ ') + '\n';
            calendarGrid += '─'.repeat(dayNames.join(' │ ').length) + '\n';

            // Fill in days
            let currentDay = 1;
            const totalRows = Math.ceil((firstDay + totalDays) / 7);

            for (let row = 0; row < totalRows; row++) {
                let rowText = '';
                for (let col = 0; col < 7; col++) {
                    const dayIndex = row * 7 + col;
                    
                    if (dayIndex < firstDay || currentDay > totalDays) {
                        rowText += '  ' + ' │ ';
                    } else {
                        // Highlight today
                        if (currentDay === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()) {
                            rowText += `[${String(currentDay).padStart(2, ' ')}] │ `;
                        } else {
                            rowText += ` ${String(currentDay).padStart(2, ' ')}  │ `;
                        }
                        currentDay++;
                    }
                }
                calendarGrid += rowText.slice(0, -3) + '\n';
            }

            // Send as premium table
            await sock.sendMessage(m.chat, {
                headerText: `## 📅 ${monthName} ${year}`,
                contentText: '---',
                title: '📆 Calendar',
                table: [
                    ['Calendar', `${monthName} ${year}`],
                    ['Days', totalDays],
                    ['Starts On', dayNames[firstDay]],
                    ['Today', `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`]
                ],
                footerText: `💡 ${prefix}calendar ${month === 12 ? 1 : month + 1} ${month === 12 ? year + 1 : year} for next month`
            }, { quoted: m });

            // Also send the visual calendar as text
            await sock.sendMessage(m.chat, {
                text: `\`\`\`📅 ${monthName} ${year}\n\n${calendarGrid}\`\`\``
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🥀', key: m.key } });

        } catch (error) {
            console.error('[CALENDAR ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to generate calendar`');
        }
    }
};
