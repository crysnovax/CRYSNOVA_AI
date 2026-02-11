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
    description: 'Check if bot is running',
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
            // Royal crown reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "👑", key: m.key } 
            });

            const userName = m.pushName || "Noble User";
            const botUptime = runtime(process.uptime());
            const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
            const usedMemory = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
            const host = os.platform();
            const ping = Date.now() - m.messageTimestamp * 1000;

            const aliveMessage = 
`✨ *${config.settings.title} is Watching Over You* ✨

╔═══════════════════
║  🏰 *ROYAL STATUS*
╠═══════════════════
║ ♕ *User:* ${userName}
║ ⏳ *Uptime:* ${botUptime}
║ 💾 *Memory:* ${usedMemory}MB / ${totalMemory}GB
║ ⚡ *Speed:* ${ping}ms
║ 🖥️ *Platform:* ${host}
║ 📜 *Creator:* ${config.owner}
╚═══════════════════

*"A queen never sleeps, and neither do I"*

👑 Serving the kingdom since deployment
📜 Developed by: ${config.settings.author}

🎭 *Join the Royal Court:*
https://whatsapp.com/channel/0029Va8YUl50bIdtVMYnYd0E`;

            await sock.sendMessage(m.chat, {
                image: { url: config.thumbUrl },
                caption: aliveMessage,
                contextInfo: {
                    mentionedJid: [m.sender],
                    externalAdReply: {
                        title: `👑 ${config.settings.title} - Royal Bot`,
                        body: config.settings.description,
                        thumbnailUrl: config.thumbUrl,
                        sourceUrl: "https://whatsapp.com/channel/0029Va8YUl50bIdtVMYnYd0E",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // Success reaction
            await sock.sendMessage(m.chat, { 
                react: { text: "✨", key: m.key } 
            });

        } catch (error) {
            console.error("Error in alive command:", error);
            await sock.sendMessage(m.chat, { 
                react: { text: "💔", key: m.key } 
            });
            await reply("❌ The royal scroll couldn't be delivered. Please try again.");
        }
    }
};