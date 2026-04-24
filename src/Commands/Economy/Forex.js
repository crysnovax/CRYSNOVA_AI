const axios = require('axios');

const POPULAR_CURRENCIES = {
    'usd': 'United States Dollar',
    'eur': 'Euro',
    'gbp': 'British Pound',
    'jpy': 'Japanese Yen',
    'cny': 'Chinese Yuan',
    'ngn': 'Nigerian Naira',
    'ghs': 'Ghanaian Cedi',
    'zar': 'South African Rand',
    'kes': 'Kenyan Shilling',
    'aed': 'UAE Dirham',
    'cad': 'Canadian Dollar',
    'aud': 'Australian Dollar',
    'inr': 'Indian Rupee',
    'brl': 'Brazilian Real',
    'chf': 'Swiss Franc'
};

module.exports = {
    name: 'forex',
    alias: ['fx', 'exchange', 'rate', 'currency'],
    desc: 'Get live foreign exchange rates',
    category: 'Search',
    usage: '.forex <from> <to> | .forex list',
    reactions: { start: '💱', success: '🪙', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const base = args[0]?.toLowerCase();
        const target = args[1]?.toLowerCase();

        if (!base) {
            const popularList = Object.keys(POPULAR_CURRENCIES).slice(0, 10).map(c => c.toUpperCase()).join(', ');
            return reply(
                `╭─❍ *FOREX RATES*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}forex <from> <to>\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}forex usd ngn\n` +
                `│ ${prefix}forex gbp eur\n` +
                `│ ${prefix}forex usd\n` +
                `│ ${prefix}forex list\n│\n` +
                `│ 💱 *Popular:* ${popularList}\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '💱', key: m.key } });

        try {
            // ── LIST CURRENCIES ────────────────────────────────────
            if (base === 'list') {
                const tableData = [['💱 Code', '🌍 Currency Name']];
                for (const [code, name] of Object.entries(POPULAR_CURRENCIES)) {
                    tableData.push([code.toUpperCase(), name]);
                }

                await sock.sendMessage(m.chat, {
                    headerText: `## 💱 Available Currencies`,
                    contentText: '---',
                    title: '🌍 15 Popular Currencies',
                    table: tableData,
                    footerText: '💡 Use .forex <from> <to> for rates'
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
                return;
            }

            // ── SINGLE RATE ────────────────────────────────────────
            const res = await axios.get(`https://api.frankfurter.app/latest`, {
                params: {
                    from: base.toUpperCase(),
                    ...(target ? { to: target.toUpperCase() } : {})
                },
                timeout: 10000,
                headers: { 'Accept': 'application/json' }
            });

            const data = res.data;
            const rates = data.rates;

            if (!rates || !Object.keys(rates).length) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply(`\`✘ Invalid currency: "${base}"\``);
            }

            // If target specified, show single rate
            if (target) {
                const rate = rates[target.toUpperCase()];
                if (!rate) {
                    await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                    return reply(`\`✘ Invalid target: "${target}"\``);
                }

                const baseName = POPULAR_CURRENCIES[base] || base.toUpperCase();
                const targetName = POPULAR_CURRENCIES[target] || target.toUpperCase();

                await sock.sendMessage(m.chat, {
                    headerText: `## 💱 ${base.toUpperCase()} → ${target.toUpperCase()}`,
                    contentText: '---',
                    title: '📊 Exchange Rate',
                    table: [
                        ['💱 Pair', `${base.toUpperCase()}/${target.toUpperCase()}`],
                        ['💰 Rate', `1 ${base.toUpperCase()} = ${rate} ${target.toUpperCase()}`],
                        ['🌍 From', baseName],
                        ['🌍 To', targetName],
                        ['📅 Date', data.date]
                    ],
                    footerText: '💡 Live rates • Powered by Frankfurter API'
                }, { quoted: m });

            } else {
                // Show all rates for base currency
                const tableData = [['💱 Currency', '💰 Rate', '🌍 Name']];
                
                for (const [code, rate] of Object.entries(rates).slice(0, 14)) {
                    const name = POPULAR_CURRENCIES[code.toLowerCase()] || code;
                    tableData.push([code, rate.toFixed(4), name]);
                }

                await sock.sendMessage(m.chat, {
                    headerText: `## 💱 1 ${base.toUpperCase()} Equals`,
                    contentText: '---',
                    title: '📊 Live Rates',
                    table: tableData,
                    footerText: `💡 SWIPE ⇆ • Date: ${data.date}`
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });

        } catch (error) {
            console.error('[FOREX ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '💤', key: m.key } });
            reply('`✘ Failed to fetch rates. Try again.`');
        }
    }
};
