const config = require("../settings/config");
const os = require("os");

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
    command: 'alive',
    description: 'Check bot magical status',
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
        config: cmdConfig,
        sender
    }) => {
        try {
            // Magic sparkle reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "🌟", key: m.key } 
            });

            const userName = m.pushName || "Magical Being";
            const botUptime = runtime(process.uptime());
            const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
            const usedMemory = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
            const ping = Date.now() - m.messageTimestamp * 1000;

            const aliveMessage = 
`🧙‍♀️ *${config.settings.title} - The Magical Assistant* 🪄

┌─✦ *ENCHANTED STATUS*
│✨ *Sorcerer:* ${userName}
│⏳ *Active Time:* ${botUptime}
│💫 *Magic Power:* ${usedMemory}MB
│⚡ *Spell Speed:* ${ping}ms
│📚 *Library:* ${config.settings.author}
│👑 *Archmage:* ${config.owner}
└─✦────────────◉

*"Magic flows through every command I cast"*

🪄 *Channel Your Magic:*
https://whatsapp.com/channel/0029Va8YUl50bIdtVMYnYd0E

${config.settings.footer}`;

            await sock.sendMessage(m.chat, {
                image: { url: config.thumbUrl },
                caption: aliveMessage,
                contextInfo: {
                    mentionedJid: [m.sender],
                    externalAdReply: {
                        title: `🧙‍♀️ ${config.settings.title}`,
                        body: config.settings.description,
                        thumbnailUrl: config.thumbUrl,
                        sourceUrl: "https://www.github.com/OfficialKango",
                        mediaType: 1
                    }
                }
            }, { quoted: m });

            // Magical success reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "🪄", key: m.key } 
            });

        } catch (error) {
            console.error("Error in alive command:", error);
            await sock.sendMessage(m.chat, { 
                react: { text: "💥", key: m.key } 
            });
            await reply("💫 The magical connection was interrupted. Try again!");
        }
    }
};