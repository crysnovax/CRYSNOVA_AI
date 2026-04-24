const axios = require('axios');
const config = require('../../../settings/config');
const ECO_API = process.env.ECO_API_URL || config.api?.economy || 'https://econ.crysnovax.link';

async function eco(endpoint, phone, body = {}) {
    const method = endpoint.startsWith('GET') ? 'get' : 'post';
    const url = ECO_API + endpoint.replace(/^(GET|POST) /, '');
    const options = { headers: { 'X-User-Phone': phone }, timeout: 15000 };
    return method === 'post' ? axios.post(url, body, options) : axios.get(url, options);
}

async function sendTable(sock, chat, header, title, rows, footer) {
    await sock.sendMessage(chat, {
        headerText: header,
        contentText: '---',
        title: title,
        table: rows,
        footerText: footer
    });
}

function myPhone(m) {
    return (m.sender || '').split('@')[0].replace(/[^0-9]/g, '');
}

const cmds = [];

// ==================== ACTIVATE ====================
cmds.push({
    name: 'economy', alias: ['ecoactivate'], category: 'Economy',
    desc: 'Activate your economy account', usage: '.economy activate <phone>',
    execute: async (sock, m, { args, reply, prefix }) => {
        const sub = args[0]?.toLowerCase();
        if (sub !== 'activate') {
            return reply(
                `╭─❍ *ECONOMY ACTIVATION*\n│\n` +
                `│ 💰 *Activate your account:*\n` +
                `│ ${prefix}economy activate <phone>\n│\n` +
                `│ ✪ *Example:*\n` +
                `│ ${prefix}economy activate 2348077528901\n│\n` +
                `│ ⚡ *Required before using commands!*\n` +
                `╰──────────────────`
            );
        }
        const phone = (args[1] || '').replace(/[^0-9]/g, '');
        if (!phone || phone.length < 7) return reply('`✘ Phone number required`');
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await eco('POST /activate', phone);
            await sendTable(sock, m.chat,
                '## 💰 Economy Activated!',
                '✅ Welcome!',
                [
                    ['📱 Phone', phone],
                    ['👛 Starting Balance', '100 coins'],
                    ['🏦 Bank', '0 coins'],
                    ['💡 Commands', '.balance | .work | .fish | .rob | .pay']
                ],
                '💡 Use .help economy for all commands!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Activation failed'}\``);
        }
    }
});

// ==================== BALANCE (FIXED) ====================
cmds.push({
    name: 'balance', alias: ['bal', 'wallet'], category: 'Economy',
    desc: 'Check your wallet and bank balance', usage: '.balance',
    reactions: { start: '💰', success: '✨', error: '❔' },
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        await sock.sendMessage(m.chat, { react: { text: '💰', key: m.key } });
        try {
            const res = await eco('GET /balance', phone);
            const { balance, bank, level } = res.data;
            await sendTable(sock, m.chat,
                `## 💰 ${phone}'s Wallet`,
                '💰 Balance',
                [
                    ['👛 Wallet', `${balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${bank.toLocaleString()} coins`],
                    ['💰 Total', `${(balance + bank).toLocaleString()} coins`],
                    ['⭐ Level', `Level ${level}`]
                ],
                '🔒 Bank money is SAFE from robbery! | .deposit | .withdraw'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            if (err.response?.status === 404 || err.response?.data?.error?.includes('not')) {
                return reply('`✘ Economy not activated! Use .economy activate <phone>`');
            }
            reply(`\`✘ ${err.response?.data?.error || 'Failed to fetch balance'}\``);
        }
    }
});

// ==================== DEPOSIT ====================
cmds.push({
    name: 'deposit', alias: ['dep'], category: 'Economy',
    desc: 'Deposit money into your bank (safe from robbery)', usage: '.deposit <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const phone = myPhone(m);
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .deposit <amount>`');
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await eco('POST /deposit', phone, { amount });
            await sendTable(sock, m.chat,
                '## 🏦 Deposit Successful',
                '✅ Funds Secured',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👛 Wallet', `${res.data.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${res.data.bank.toLocaleString()} coins`]
                ],
                '🔒 Money in bank CANNOT be stolen!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Deposit failed'}\``);
        }
    }
});

// ==================== WITHDRAW ====================
cmds.push({
    name: 'withdraw', alias: ['with', 'wdraw'], category: 'Economy',
    desc: 'Withdraw money from your bank', usage: '.withdraw <amount>',
    reactions: { start: '🏦', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const phone = myPhone(m);
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) return reply('`✘ .withdraw <amount>`');
        await sock.sendMessage(m.chat, { react: { text: '🏦', key: m.key } });
        try {
            const res = await eco('POST /withdraw', phone, { amount });
            await sendTable(sock, m.chat,
                '## 🏦 Withdrawal Successful',
                '✅ Funds Released',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👛 Wallet', `${res.data.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${res.data.bank.toLocaleString()} coins`]
                ],
                '💡 Keep some in the bank for safety!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Withdrawal failed'}\``);
        }
    }
});

// ==================== PAY (phone=amount format) ====================
cmds.push({
    name: 'pay', alias: ['send', 'transfer'], category: 'Economy',
    desc: 'Pay coins to another user by phone number', usage: '.pay <phone>=<amount>',
    reactions: { start: '💸', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const senderPhone = myPhone(m);
        const input = args.join(' ').replace(/\s/g, '');
        const match = input.match(/^(\d{7,15})=(\d+)$/);
        if (!match) return reply('`✘ Format: .pay 2348077528901=500`');
        const targetPhone = match[1];
        const amount = parseInt(match[2]);
        if (!amount || amount <= 0) return reply('`✘ Amount must be positive`');
        if (targetPhone === senderPhone) return reply('`✘ Cannot pay yourself!`');
        await sock.sendMessage(m.chat, { react: { text: '💸', key: m.key } });
        try {
            const res = await eco('POST /pay', senderPhone, { to: targetPhone, amount });
            await sendTable(sock, m.chat,
                '## 💸 Payment Sent',
                '✅ Success',
                [
                    ['💰 Amount', `${amount.toLocaleString()} coins`],
                    ['👤 To', targetPhone],
                    ['👛 Your Balance', `${res.data.senderBalance.toLocaleString()} coins`]
                ],
                '💡 Money transferred!'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Payment failed'}\``);
        }
    }
});

// ==================== ROB (WALLET ONLY - BANK SAFE) ====================
cmds.push({
    name: 'rob', alias: ['steal', 'mug'], category: 'Economy',
    desc: 'Attempt to rob someone (wallet only, bank is safe)', usage: '.rob <phone>',
    reactions: { start: '😈', success: '✨', error: '❔' },
    execute: async (sock, m, { args, reply }) => {
        const robberPhone = myPhone(m);
        const targetPhone = (args[0] || '').replace(/[^0-9]/g, '');
        if (!targetPhone) return reply('`✘ .rob <phone>`');
        if (targetPhone === robberPhone) return reply('`✘ Cannot rob yourself!`');
        await sock.sendMessage(m.chat, { react: { text: '😈', key: m.key } });
        try {
            const res = await eco('POST /rob', robberPhone, { target: targetPhone });
            const d = res.data;
            if (d.success) {
                await sendTable(sock, m.chat,
                    '## 😈 Robbery Successful!',
                    '💰 Stolen',
                    [
                        ['💰 Stolen', `${d.stolen.toLocaleString()} coins`],
                        ['👤 From', targetPhone],
                        ['👛 Your Balance', `${d.balance.toLocaleString()} coins`]
                    ],
                    '💡 1 min cooldown | Bank money is always safe!'
                );
            } else {
                await sendTable(sock, m.chat,
                    '## 🚔 Robbery Failed!',
                    '❌ Caught',
                    [
                        ['📝 Result', d.message],
                        ['💰 Penalty', 'Lost 50 coins'],
                        ['👛 Your Balance', `${d.balance.toLocaleString()} coins`]
                    ],
                    '🔒 Target\'s bank money is protected!'
                );
            }
            await sock.sendMessage(m.chat, { react: { text: d.success ? '🔖' : '❔', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Robbery failed'}\``);
        }
    }
});

// ==================== WORK ====================
cmds.push({
    name: 'work', alias: ['job', 'earn'], category: 'Economy',
    desc: 'Work to earn coins and XP', usage: '.work',
    reactions: { start: '💼', success: '✨', error: '❔' },
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        await sock.sendMessage(m.chat, { react: { text: '💼', key: m.key } });
        try {
            const res = await eco('POST /work', phone);
            await sendTable(sock, m.chat,
                '## 💼 Work Complete!',
                '💰 Earnings',
                [
                    ['💰 Earned', `${res.data.earnings.toLocaleString()} coins`],
                    ['⭐ Level', `Level ${res.data.level}`],
                    ['👛 Balance', `${res.data.newBalance.toLocaleString()} coins`]
                ],
                '💡 Work more to level up! 1 min cooldown.'
            );
            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });
        } catch (err) {
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${err.response?.data?.error || 'Work failed'}\``);
        }
    }
});

// ==================== ECOROFILE ====================
cmds.push({
    name: 'ecoprofile', alias: ['eprofile', 'stats'], category: 'Economy',
    desc: 'View your full economy profile', usage: '.ecoprofile',
    execute: async (sock, m, { reply }) => {
        const phone = myPhone(m);
        try {
            const res = await eco('GET /profile', phone);
            const d = res.data;
            await sendTable(sock, m.chat,
                `## 👤 ${phone}'s Profile`,
                '📊 Economy Stats',
                [
                    ['💰 Wallet', `${d.balance.toLocaleString()} coins`],
                    ['🏦 Bank', `${d.bank.toLocaleString()} coins`],
                    ['⭐ Level', `Level ${d.level}`],
                    ['✨ XP', `${d.xp} XP`],
                    ['💪 Strength', d.stats?.strength || 0],
                    ['🍀 Luck', d.stats?.luck || 0],
                    ['🧠 Intelligence', d.stats?.intelligence || 0],
                    ['🎭 Faction', d.faction || 'None'],
                    ['🎒 Items', `${d.inventory || 0} items`],
                    ['💳 Loan', d.loan ? `${d.loan.toLocaleString()} coins` : 'None']
                ],
                '💡 Use .help economy for all commands'
            );
        } catch (err) {
            reply(`\`✘ ${err.response?.data?.error || 'Failed'}\``);
        }
    }
});

// ==================== LEADERBOARD ====================
cmds.push({
    name: 'leaderboard', alias: ['lb', 'top', 'richlist'], category: 'Economy',
    desc: 'View the richest players', usage: '.leaderboard',
    execute: async (sock, m, { reply }) => {
        try {
            const res = await eco('GET /admin/stats', '0');
            const users = (res.data.users || []).sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank)).slice(0, 10);
            if (!users.length) return reply('`📊 No users yet!`');
            const rows = [['🏆 Rank', '👤 Phone', '💰 Wealth']];
            users.forEach((u, i) => {
                rows.push([`#${i + 1}`, u.phone, `${(u.balance + u.bank).toLocaleString()} coins`]);
            });
            await sendTable(sock, m.chat,
                '## 🏆 Richest Players',
                '💰 Top 10',
                rows,
                '💡 Work hard to climb the ranks!'
            );
        } catch (err) {
            reply('`✘ Failed to load leaderboard`');
        }
    }
});

// ==================== QUICK COMMANDS ====================
const quick = [
    { n: 'fish', a: ['fishing'], u: '.fish', d: 'Go fishing for random rewards',
        f: async (s, m, p) => {
            const r = await eco('POST /fish', p);
            await s.sendMessage(m.chat, { text: `🎣 *${r.data.item}*\n💰 +${r.data.reward} coins | Balance: ${r.data.newBalance || '?'}` });
        }
    },
    { n: 'mine', a: ['mining'], u: '.mine', d: 'Mine for valuable ores',
        f: async (s, m, p) => {
            const r = await eco('POST /mine', p);
            await s.sendMessage(m.chat, { text: `⛏️ *${r.data.ore}*\n💰 +${r.data.reward} coins` });
        }
    },
    { n: 'hunt', a: ['hunting'], u: '.hunt', d: 'Hunt animals for profit',
        f: async (s, m, p) => {
            const r = await eco('POST /hunt', p);
            await s.sendMessage(m.chat, { text: `🏹 *${r.data.animal}*\n💰 +${r.data.reward} coins` });
        }
    },
    { n: 'beg', a: ['plead'], u: '.beg', d: 'Beg for spare coins',
        f: async (s, m, p) => {
            const r = await eco('POST /beg', p);
            await s.sendMessage(m.chat, { text: `🥺 Someone gave you *${r.data.reward} coins!*` });
        }
    },
    { n: 'crime', u: '.crime', d: 'Commit a crime (risky!)',
        f: async (s, m, p) => {
            const r = await eco('POST /crime', p);
            await s.sendMessage(m.chat, { text: r.data.success ? `🔫 Success! +${r.data.reward} coins` : `🚔 ${r.data.message}` });
        }
    },
    { n: 'drugs', u: '.drugs', d: 'Deal drugs (high risk, high reward)',
        f: async (s, m, p) => {
            const r = await eco('POST /drugs', p);
            await s.sendMessage(m.chat, { text: r.data.success ? `💊 Profit! +${r.data.profit} coins` : `🚔 ${r.data.message}` });
        }
    },
    { n: 'daily', u: '.daily', d: 'Claim your daily reward (500 coins)',
        f: async (s, m, p) => {
            const r = await eco('POST /daily', p);
            await s.sendMessage(m.chat, { text: `📅 Daily reward: +${r.data.reward} coins` });
        }
    },
    { n: 'weekly', u: '.weekly', d: 'Claim your weekly bonus (2000 coins)',
        f: async (s, m, p) => {
            const r = await eco('POST /weekly', p);
            await s.sendMessage(m.chat, { text: `🎁 Weekly bonus: +${r.data.reward} coins` });
        }
    },
    { n: 'attack', u: '.attack <phone>', d: 'Attack another player',
        f: async (s, m, p, a) => {
            const t = (a[0] || '').replace(/[^0-9]/g, '');
            if (!t) return s.sendMessage(m.chat, { text: '`✘ .attack <phone>`' });
            const r = await eco('POST /attack', p, { target: t });
            await s.sendMessage(m.chat, { text: r.data.win ? `⚔️ Victory! +${r.data.stolen} coins` : `💀 Defeat! Lost 30 coins` });
        }
    },
    { n: 'gift', u: '.gift <phone> <amount>', d: 'Gift coins to someone',
        f: async (s, m, p, a) => {
            const t = (a[0] || '').replace(/[^0-9]/g, '');
            const amt = parseInt(a[1]);
            if (!t || !amt) return s.sendMessage(m.chat, { text: '`✘ .gift <phone> <amount>`' });
            const r = await eco('POST /gift', p, { to: t, amount: amt });
            await s.sendMessage(m.chat, { text: `🎁 ${r.data.message}` });
        }
    },
    { n: 'loan', u: '.loan <amount>', d: 'Take a loan (max 1000 coins)',
        f: async (s, m, p, a) => {
            const amt = parseInt(a[0]);
            if (!amt) return s.sendMessage(m.chat, { text: '`✘ .loan <amount>`' });
            const r = await eco('POST /loan', p, { amount: amt });
            await s.sendMessage(m.chat, { text: `💳 Loan: ${r.data.loanAmount} coins` });
        }
    },
    { n: 'shop', u: '.shop', d: 'View the item shop',
        f: async (s, m) => {
            const r = await eco('GET /shop', '0');
            const rows = [['🛍️ Item', '💰 Price', '📝 Description']];
            r.data.shop.forEach(i => rows.push([i.name, `${i.price} coins`, i.description]));
            await sendTable(s, m.chat, '## 🛍️ Economy Shop', '🏪 Items For Sale', rows, '💡 Use .buy <item> to purchase!');
        }
    },
    { n: 'buy', u: '.buy <item>', d: 'Buy an item from the shop',
        f: async (s, m, p, a) => {
            const item = a.join('_').replace(/\s/g, '_');
            if (!item) return s.sendMessage(m.chat, { text: '`✘ .buy pickaxe`' });
            const r = await eco('POST /buy', p, { item });
            await s.sendMessage(m.chat, { text: `🛒 ${r.data.message}` });
        }
    },
    { n: 'sell', u: '.sell <item>', d: 'Sell an item from inventory',
        f: async (s, m, p, a) => {
            const item = a.join('_').replace(/\s/g, '_');
            if (!item) return s.sendMessage(m.chat, { text: '`✘ .sell pickaxe`' });
            const r = await eco('POST /sell', p, { item });
            await s.sendMessage(m.chat, { text: `💰 ${r.data.message}` });
        }
    },
    { n: 'inventory', a: ['inv'], u: '.inventory', d: 'View your backpack',
        f: async (s, m, p) => {
            const r = await eco('GET /inventory', p);
            const items = r.data.inventory || [];
            if (!items.length) return s.sendMessage(m.chat, { text: '`🎒 Your backpack is empty!`' });
            const rows = [['🎒 Item', '📦 Quantity']];
            items.forEach(i => rows.push([i.name, i.quantity]));
            await sendTable(s, m.chat, '## 🎒 Inventory', '📦 Your Items', rows, '💡 Use .sell <item> to sell items');
        }
    },
    { n: 'training', u: '.training <stat>', d: 'Train your stats (strength/luck/intelligence)',
        f: async (s, m, p, a) => {
            const stat = a[0];
            if (!stat) return s.sendMessage(m.chat, { text: '`✘ .training strength|luck|intelligence`' });
            const r = await eco('POST /training', p, { stat });
            await s.sendMessage(m.chat, { text: `💪 ${r.data.message}\n📊 Str: ${r.data.stats?.strength||0} | Luck: ${r.data.stats?.luck||0} | Int: ${r.data.stats?.intelligence||0}` });
        }
    },
    { n: 'levelup', u: '.levelup', d: 'Level up your character',
        f: async (s, m, p) => {
            const r = await eco('POST /levelup', p);
            await s.sendMessage(m.chat, { text: `⭐ Level Up! You are now Level ${r.data.level}` });
        }
    },
    { n: 'travel', u: '.travel <destination>', d: 'Travel to unlock bonuses',
        f: async (s, m, p, a) => {
            const dest = a[0];
            if (!dest) return s.sendMessage(m.chat, { text: '`✘ .travel city|forest|ocean|mountains`' });
            const r = await eco('POST /travel', p, { destination: dest });
            await s.sendMessage(m.chat, { text: `✈️ ${r.data.message}` });
        }
    },
    { n: 'faction', u: '.faction <join/leave> <name>', d: 'Join or leave a faction',
        f: async (s, m, p, a) => {
            const action = a[0], faction = a[1];
            if (!action) return s.sendMessage(m.chat, { text: '`✘ .faction join|leave <faction>`' });
            const r = await eco('POST /faction', p, { action, faction });
            await s.sendMessage(m.chat, { text: `🎭 ${r.data.faction ? `Joined: ${r.data.faction}` : 'Left faction'}` });
        }
    }
];

quick.forEach(q => {
    cmds.push({
        name: q.n, alias: q.a || [], category: 'Economy', desc: q.d, usage: q.u,
        execute: async (sock, m, { args, reply }) => {
            const phone = myPhone(m);
            try {
                await q.f(sock, m, phone, args);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                reply(`\`✘ ${err.response?.data?.error || 'Failed'}\``);
            }
        }
    });
});

module.exports = cmds;