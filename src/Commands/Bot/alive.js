module.exports = {
    name: 'alive',
    alias: ['online', 'bot'],
    desc: 'Check if ZEE BOT is alive',
    category: 'Bot',
    reactions: { start: '🌀', success: '👾' },
    execute: async (sock, m, { reply, config }) => {
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const min = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        await reply(
            `╭─❍ *ZEE BOT V2*\n` +
            `│ ⚉ Status: _Online_\n` +
            `│ ⏱ Uptime: ${h}h ${min}m ${s}s\n` +
            `│ ✦ Prefix: ${config.settings?.prefix || '.'}\n` +
            `│ ☬ Mode: ${config.status?.public ? 'Public' : 'Private'}\n` +
            `│ ✪ Version: 2.0.0\n` +
            `╰─ 𓄄 Powered by CRYSNOVA AI\`\`\``
        );
    }
};
