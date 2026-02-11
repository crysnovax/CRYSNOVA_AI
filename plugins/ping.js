module.exports = {
    command: 'ping',
    description: 'Check bot response time',
    category: 'general',
    execute: async (sock, m, {
        args,
        text,
        q,
        quoted,
        mime,
        qmsg,
        isMedia,
        groupMetadata,
        groupName,
        participants,
        groupOwner,
        groupAdmins,
        isBotAdmins,
        isAdmins,
        isGroupOwner,
        isCreator,
        prefix,
        reply,
        config
    }) => {
        const start = Date.now();
        await reply('🏓 Pong!');
        const latency = Date.now() - start;
        await reply(`🏓 Pong!\n⏱️ Response Time: ${latency}ms\n💭 Runtime: ${process.uptime().toFixed(2)}s`);
    }
};
