const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ics',
    alias: [],
    category: 'Documents',
    desc: 'Generate a calendar event (.ics) file',
    usage: '.ics Title | Location | YYYY-MM-DD | HH:MM | Duration(min)',

    execute: async (sock, m, { args, reply }) => {
        const input = args.join(' ').trim();
        if (!input) return reply('⚉ Usage: .ics Meeting | Office | 2026-05-10 | 14:00 | 60');

        const parts = input.split('|').map(p => p.trim());
        const title = parts[0] || 'Event';
        const location = parts[1] || '';
        const date = parts[2] || new Date().toISOString().split('T')[0];
        const time = parts[3] || '12:00';
        const duration = parseInt(parts[4]) || 60;

        const startTime = `${date}T${time}:00`.replace(/[^0-9T:]/g, '');
        const endDate = new Date(`${date}T${time}:00`);
        endDate.setMinutes(endDate.getMinutes() + duration);
        const endTime = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const startFormatted = `${date}T${time}:00`.replace(/[-:]/g, '') + 'Z';

        let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n';
        ics += `DTSTART:${startFormatted}\n`;
        ics += `DTEND:${endTime}\n`;
        ics += `SUMMARY:${title}\n`;
        if (location) ics += `LOCATION:${location}\n`;
        ics += 'END:VEVENT\nEND:VCALENDAR';

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `event_${Date.now()}.ics`);
        fs.writeFileSync(filePath, ics);

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: `${title}.ics`,
            mimetype: 'text/calendar',
            caption: `📅 Event: ${title}\n📍 ${location}\n📆 ${date} at ${time}\n⏱ ${duration}min`
        }, { quoted: m });

        fs.unlinkSync(filePath);
    }
};
