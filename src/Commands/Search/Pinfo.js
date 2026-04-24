const axios = require('axios');

module.exports = {
    name: 'phoneinfo',
    alias: ['phone', 'number', 'whoiscalling'],
    desc: 'Get phone number information',
    category: 'Search',
    usage: '.phoneinfo <number with country code>',
    reactions: { start: '📞', success: '📡', error: '🏗️' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const phone = args[0]?.replace(/[^0-9]/g, '');
        
        if (!phone) {
            return reply(
                `╭─❍ *PHONE INFO*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}phoneinfo <number>\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}phoneinfo 2348077528901\n` +
                `│ ${prefix}phoneinfo 12025551234\n│\n` +
                `│ 📞 *Include country code!*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '📞', key: m.key } });

        try {
            const res = await axios.get(`https://api.apilayer.com/number_verification/validate?number=${phone}`, {
                headers: { 'apikey': 'YOUR_API_KEY' },
                timeout: 10000
            });

            const data = res.data;

            await sock.sendMessage(m.chat, {
                headerText: `## 📞 Phone Info`,
                contentText: '---',
                title: '📊 Number Details',
                table: [
                    ['📞 Number', data.number || phone],
                    ['🌍 Country', data.country_name || 'N/A'],
                    ['🏛️ Code', `+${data.country_code || 'N/A'}`],
                    ['📍 Location', data.location || 'N/A'],
                    ['📡 Carrier', data.carrier || 'N/A'],
                    ['📱 Line Type', data.line_type || 'N/A'],
                    ['✅ Valid', data.valid ? 'Yes 🔖' : 'No 🏗️']
                ],
                footerText: '💡 Include country code for accurate results'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🎭', key: m.key } });

        } catch (error) {
            await sock.sendMessage(m.chat, { react: { text: '🏗️', key: m.key } });
            reply('`✘ Failed to lookup number. Try with country code.`');
        }
    }
};
