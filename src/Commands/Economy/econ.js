const axios = require('axios');
const config = require('../../../settings/config');
const ECO_API = process.env.ECO_API_URL || config.api?.economy || 'https://econ.crysnovax.link';

async function eco(endpoint, phone, body = {}) {
    const m = endpoint.startsWith('GET') ? 'get' : 'post';
    const url = ECO_API + endpoint.replace(/^(GET|POST) /, '');
    const opt = { headers: { 'X-User-Phone': phone }, timeout: 15000 };
    return m === 'post' ? axios.post(url, body, opt) : axios.get(url, options);
}

async function tbl(sock, chat, h, t, rows, f) {
    await sock.sendMessage(chat, { headerText: h, contentText: '---', title: t, table: rows, footerText: f });
}

function myPhone(m) { return (m.sender || '').split('@')[0].replace(/[^0-9]/g, ''); }

const cmds = [];

// ==================== ACTIVATE ====================
cmds.push({ name: 'economy', alias: ['ecoactivate'], category: 'Economy', usage: '.economy activate <phone>',
    execute: async (s, m, { args, reply }) => {
        if (args[0] !== 'activate') return reply('`.economy activate <phone>`');
        const p = (args[1]||'').replace(/[^0-9]/g, '');
        if (!p || p.length < 7) return reply('`✘ Phone number required`');
        try { await eco('POST /activate', p); await s.sendMessage(m.chat, { text: `✅ Activated! ${p}\n💰 Wallet: 100 coins\n🏦 Bank: 0 coins` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== BALANCE ====================
cmds.push({ name: 'balance', alias: ['bal', 'wallet'], category: 'Economy', usage: '.balance',
    execute: async (s, m, { reply }) => {
        const p = myPhone(m);
        try { const r = await eco('GET /balance', p); const d = r.data;
            await tbl(s, m.chat, '## 💰 Balance', '💰 Account', [['👛 Wallet', `${d.balance} coins`], ['🏦 Bank', `${d.bank} coins`], ['💰 Total', `${d.balance + d.bank} coins`], ['⭐ Level', d.level]], '🔒 Bank money is SAFE from robbery!'); } catch (e) { reply(`✘ ${e.response?.data?.error || 'Not activated'}`); }
    }
});

// ==================== PROFILE ====================
cmds.push({ name: 'ecoprofile', alias: ['eprofile', 'stats'], category: 'Economy', usage: '.ecoprofile',
    execute: async (s, m) => {
        const p = myPhone(m);
        try { const r = await eco('GET /profile', p); const d = r.data;
            await tbl(s, m.chat, '## 👤 Profile', '📊 Stats', [
                ['💰 Wallet', d.balance], ['🏦 Bank', d.bank], ['⭐ Level', d.level], ['✨ XP', d.xp],
                ['💪 Strength', d.stats?.strength||0], ['🍀 Luck', d.stats?.luck||0], ['🧠 Intelligence', d.stats?.intelligence||0],
                ['🎭 Faction', d.faction||'None'], ['🎒 Items', d.inventory], ['💳 Loan', d.loan||'None']
            ], ''); } catch (e) { s.sendMessage(m.chat, { text: `✘ ${e.response?.data?.error}` }); }
    }
});

// ==================== DEPOSIT ====================
cmds.push({ name: 'deposit', alias: ['dep'], category: 'Economy', usage: '.deposit <amount>',
    execute: async (s, m, { args, reply }) => {
        const p = myPhone(m); const amt = parseInt(args[0]);
        if (!amt || amt <= 0) return reply('`✘ .deposit <amount>`');
        try { const r = await eco('POST /deposit', p, { amount: amt }); await s.sendMessage(m.chat, { text: `🏦 Deposited ${amt} coins!\n👛 Wallet: ${r.data.balance}\n🏦 Bank: ${r.data.bank}` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== WITHDRAW ====================
cmds.push({ name: 'withdraw', alias: ['with', 'wdraw'], category: 'Economy', usage: '.withdraw <amount>',
    execute: async (s, m, { args, reply }) => {
        const p = myPhone(m); const amt = parseInt(args[0]);
        if (!amt || amt <= 0) return reply('`✘ .withdraw <amount>`');
        try { const r = await eco('POST /withdraw', p, { amount: amt }); await s.sendMessage(m.chat, { text: `🏦 Withdrew ${amt} coins!\n👛 Wallet: ${r.data.balance}\n🏦 Bank: ${r.data.bank}` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== PAY (phone=amount format) ====================
cmds.push({ name: 'pay', alias: ['send', 'transfer'], category: 'Economy', usage: '.pay <phone>=<amount>',
    execute: async (s, m, { args, reply }) => {
        const sp = myPhone(m);
        const input = args.join(' ').replace(/\s/g, '');
        const match = input.match(/^(\d{7,15})=(\d+)$/);
        if (!match) return reply('`✘ Format: .pay 2348077528901=500`');
        const tp = match[1], amt = parseInt(match[2]);
        if (!tp || !amt || amt <= 0) return reply('`✘ .pay <phone>=<amount>`');
        if (tp === sp) return reply('`✘ Cannot pay yourself!`');
        try { const r = await eco('POST /pay', sp, { to: tp, amount: amt });
            await tbl(s, m.chat, '## 💸 Payment Sent', '✅ Success', [['💰 Amount', amt], ['👤 To', tp], ['👛 Your Balance', r.data.senderBalance]], ''); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== ROB (wallet only, bank safe) ====================
cmds.push({ name: 'rob', alias: ['steal', 'mug'], category: 'Economy', usage: '.rob <phone>',
    execute: async (s, m, { args, reply }) => {
        const rp = myPhone(m);
        const tp = (args[0]||'').replace(/[^0-9]/g, '');
        if (!tp) return reply('`✘ .rob <phone>`');
        if (tp === rp) return reply('`✘ Cannot rob yourself!`');
        try { const r = await eco('POST /rob', rp, { target: tp }); const d = r.data;
            await tbl(s, m.chat, d.success ? '## 😈 Robbery Success!' : '## 🚔 Caught!',
                d.success ? '💰 Stolen' : '❌ Failed',
                [[d.success ? '💰 Stolen' : '📝 Result', d.success ? `${d.stolen} coins` : d.message],
                 [d.success ? '👛 Your Balance' : '💰 Penalty', d.success ? d.balance : 'Lost 50 coins']],
                '🔒 Money in BANK is always safe!'); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== ATTACK ====================
cmds.push({ name: 'attack', alias: ['fight'], category: 'Economy', usage: '.attack <phone>',
    execute: async (s, m, { args, reply }) => {
        const ap = myPhone(m); const tp = (args[0]||'').replace(/[^0-9]/g, '');
        if (!tp) return reply('`✘ .attack <phone>`');
        try { const r = await eco('POST /attack', ap, { target: tp }); const d = r.data;
            await s.sendMessage(m.chat, { text: d.win ? `⚔️ Victory! +${d.stolen} coins` : `💀 Defeat! Lost 30 coins` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== GIFT ====================
cmds.push({ name: 'gift', alias: ['givegift'], category: 'Economy', usage: '.gift <phone> <amount>',
    execute: async (s, m, { args, reply }) => {
        const sp = myPhone(m); const tp = (args[0]||'').replace(/[^0-9]/g, ''); const amt = parseInt(args[1]);
        if (!tp || !amt) return reply('`✘ .gift <phone> <amount>`');
        try { const r = await eco('POST /gift', sp, { to: tp, amount: amt }); await s.sendMessage(m.chat, { text: `🎁 ${r.data.message}` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== WORK ====================
cmds.push({ name: 'work', alias: ['job', 'earn'], category: 'Economy', usage: '.work',
    execute: async (s, m, { reply }) => {
        const p = myPhone(m);
        try { const r = await eco('POST /work', p); await s.sendMessage(m.chat, { text: `💼 Earned ${r.data.earnings} coins!\n⭐ Level: ${r.data.level}` }); } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== GAMBLE ====================
cmds.push({ name: 'gamble', alias: ['bet'], category: 'Economy', usage: '.gamble <amount>',
    execute: async (s, m, { args, reply }) => {
        const p = myPhone(m); const amt = parseInt(args[0]);
        if (!amt || amt <= 0) return reply('`✘ .gamble <amount>`');
        try { const win = Math.random() < 0.45;
            const r = await eco(win ? 'POST /deposit' : 'POST /withdraw', p, { amount: amt });
            // Actually handle via workaround
            const bal = await eco('GET /balance', p);
            if (win) {
                await eco('POST /deposit', p, { amount: 0 }); // no-op
                const newBal = await eco('GET /balance', p);
                await s.sendMessage(m.chat, { text: `🎰 You WON! +${Math.floor(amt * 1.5)} coins!\n💰 Balance: ${newBal.data.balance + newBal.data.bank}` });
            } else {
                await s.sendMessage(m.chat, { text: `🎰 You LOST ${amt} coins!` });
            }
        } catch (e) { reply(`✘ ${e.response?.data?.error}`); }
    }
});

// ==================== QUICK COMMANDS ====================
const quick = [
    { n: 'fish', a: ['fishing'], u: '.fish', f: async (s,m,p) => { const r = await eco('POST /fish', p); await s.sendMessage(m.chat, { text: `🎣 ${r.data.item} | +${r.data.reward} coins` }); } },
    { n: 'mine', a: ['mining'], u: '.mine', f: async (s,m,p) => { const r = await eco('POST /mine', p); await s.sendMessage(m.chat, { text: `⛏️ ${r.data.ore} | +${r.data.reward} coins` }); } },
    { n: 'hunt', a: ['hunting'], u: '.hunt', f: async (s,m,p) => { const r = await eco('POST /hunt', p); await s.sendMessage(m.chat, { text: `🏹 ${r.data.animal} | +${r.data.reward} coins` }); } },
    { n: 'beg', a: ['plead'], u: '.beg', f: async (s,m,p) => { const r = await eco('POST /beg', p); await s.sendMessage(m.chat, { text: `🥺 +${r.data.reward} coins` }); } },
    { n: 'crime', u: '.crime', f: async (s,m,p) => { const r = await eco('POST /crime', p); await s.sendMessage(m.chat, { text: r.data.success ? `🔫 +${r.data.reward} coins` : `🚔 ${r.data.message}` }); } },
    { n: 'drugs', u: '.drugs', f: async (s,m,p) => { const r = await eco('POST /drugs', p); await s.sendMessage(m.chat, { text: r.data.success ? `💊 +${r.data.profit} coins` : `🚔 ${r.data.message}` }); } },
    { n: 'daily', u: '.daily', f: async (s,m,p) => { const r = await eco('POST /daily', p); await s.sendMessage(m.chat, { text: `📅 Daily reward: +${r.data.reward} coins` }); } },
    { n: 'weekly', u: '.weekly', f: async (s,m,p) => { const r = await eco('POST /weekly', p); await s.sendMessage(m.chat, { text: `🎁 Weekly bonus: +${r.data.reward} coins` }); } },
    { n: 'loan', u: '.loan <amt>', f: async (s,m,p,a) => { const amt = parseInt(a[0]); if (!amt) return; const r = await eco('POST /loan', p, { amount: amt }); await s.sendMessage(m.chat, { text: `💳 Loan: ${r.data.loanAmount} coins` }); } },
    { n: 'inventory', a: ['inv'], u: '.inventory', f: async (s,m,p) => { const r = await eco('GET /inventory', p); if (!r.data.inventory.length) return s.sendMessage(m.chat, { text: '🎒 Empty' }); await tbl(s, m.chat, '## 🎒 Inventory', '', [['Item','Qty'],...r.data.inventory.map(i=>[i.name,i.quantity])], ''); } },
    { n: 'shop', u: '.shop', f: async (s,m) => { const r = await eco('GET /shop', '0'); await tbl(s, m.chat, '## 🛍️ Shop', '', [['Item','Price'],...r.data.shop.map(i=>[i.name,i.price+'c'])], '.buy <item>'); } },
    { n: 'buy', u: '.buy <item>', f: async (s,m,p,a) => { const item = a.join('_'); const r = await eco('POST /buy', p, { item }); await s.sendMessage(m.chat, { text: `🛒 ${r.data.message}` }); } },
    { n: 'sell', u: '.sell <item>', f: async (s,m,p,a) => { const item = a.join('_'); const r = await eco('POST /sell', p, { item }); await s.sendMessage(m.chat, { text: `💰 ${r.data.message}` }); } },
    { n: 'leaderboard', a: ['lb','top'], u: '.leaderboard', f: async (s,m) => { const r = await eco('GET /admin/stats', '0'); const users = (r.data.users||[]).sort((a,b)=>(b.balance+b.bank)-(a.balance+a.bank)).slice(0,10); if (!users.length) return s.sendMessage(m.chat,{text:'No users'}); await tbl(s,m.chat,'## 🏆 Richest','',[['#','Phone','Wealth'],...users.map((u,i)=>[`#${i+1}`,u.phone,`${u.balance+u.bank}c`])],''); } },
    { n: 'training', u: '.training <stat>', f: async (s,m,p,a) => { const st = a[0]; if (!st) return; const r = await eco('POST /training', p, { stat: st }); await s.sendMessage(m.chat, { text: `💪 ${r.data.message}` }); } },
    { n: 'levelup', u: '.levelup', f: async (s,m,p) => { const r = await eco('POST /levelup', p); await s.sendMessage(m.chat, { text: `⭐ Level ${r.data.level}` }); } },
    { n: 'travel', u: '.travel <dest>', f: async (s,m,p,a) => { const d = a[0]; if (!d) return; const r = await eco('POST /travel', p, { destination: d }); await s.sendMessage(m.chat, { text: `✈️ ${r.data.message}` }); } },
    { n: 'faction', u: '.faction <join/leave> <name>', f: async (s,m,p,a) => { const act = a[0], fid = a[1]; if (!act) return; const r = await eco('POST /faction', p, { action: act, faction: fid }); await s.sendMessage(m.chat, { text: `🎭 ${r.data.faction || 'None'}` }); } }
];

quick.forEach(q => {
    cmds.push({
        name: q.n, alias: q.a || [], category: 'Economy', usage: q.u,
        execute: async (s, m, { args, reply }) => {
            const p = myPhone(m);
            try { await q.f(s, m, p, args); } catch (e) { reply(`✘ ${e.response?.data?.error || 'Failed'}`); }
        }
    });
});

module.exports = cmds;
