module.exports = {
    name: 'alive',
    alias: ['online', 'status'],
    desc: 'Check if bot is alive',
    category: 'Bot',
    execute: async (sock, m, { reply }) => {
        const up = Math.floor((Date.now() - global.crysStats.startTime) / 1000);
        const h  = Math.floor(up / 3600);
        const mn = Math.floor((up % 3600) / 60);
        const s  = up % 60;
        await reply(`╔═══════════════════╗\n║  BOT STATUS       ║\n╚═══════════════════╝\n\n✅ *Status:* Online\n⏱️ *Uptime:* ${h}h ${mn}m ${s}s\n📊 *Messages:* ${global.crysStats.messages}\n⚡ *Commands:* ${global.crysStats.commands}\n🤖 *Version:* 2.0.0\n\n_CRYSNOVA AI V2 - Professional_`);
    }
};
