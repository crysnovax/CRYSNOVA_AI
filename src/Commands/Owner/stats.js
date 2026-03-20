module.exports = {
    name: 'stats',
    alias: ['status', 'botstats'],
    desc: 'Show bot statistics',
    category: 'Owner',
    ownerOnly: true,
    reactions: { start: '📊', success: '♎' },
    execute: async (sock, m, { reply }) => {
        const s = process.uptime();
        const h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
        await reply(
            `╔══════════════════════╗\n` +
            `║  ZEE BOT Statistics  ║\n` +
            `╚══════════════════════╝\n\n` +
            `⏰ Uptime: ${h}h ${min}m ${sec}s\n` +
            `📩 Messages: ${global.crysStats?.messages || 0}\n` +
            `⚡ Commands: ${global.crysStats?.commands || 0}\n` +
            `🤖 Bot: ${sock.user?.name || 'ZEE BOT'}\n` +
            `📱 Number: ${sock.user?.id?.split(':')[0]}\n\n` +
            `© ZEE BOT | Powered by CRYSNOVA AI`
        );
    }
};
