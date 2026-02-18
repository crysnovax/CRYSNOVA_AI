module.exports = {
    name: 'about',
    alias: ['info'],
    desc: 'About this bot',
    category: 'Bot',
    execute: async (sock, m, { reply, config }) => {
        await reply(`╔═══════════════════════╗\n║  CRYSNOVA AI V2.0    ║\n╚═══════════════════════╝\n\n🤖 *Bot:* ${config.settings.title}\n👑 *Owner:* CRYSNOVA\n⚡ *Version:* 2.0.0\n🌐 *Library:* Baileys\n📦 *Commands:* Kord-Style\n🔗 *Connection:* CRYSNOVA V1.0\n\n📢 Channel: https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38\n🐙 GitHub: ${config.settings.author}`);
    }
};
