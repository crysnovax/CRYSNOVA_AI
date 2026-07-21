const os = require('os');

module.exports = {
    name: 'alive',
    alias: [],
    desc: 'Display bot health and statistics',
    category: 'info',
    usage: '.botstatus',
    reactions: {
        start: '📊',
        success: '📅'
    },
    execute: async (sock, message, { reply }) => {
        // Send initial reaction
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: '📊',
                key: message.key
            }
        });

        try {
            // Calculate uptime
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            // Memory calculations
            const totalMemory = os.totalmem() / (1024 * 1024 * 1024);
            const freeMemory = os.freemem() / (1024 * 1024 * 1024);
            const usedMemory = totalMemory - freeMemory;

            // Get stats from global.crysStats (like the working example)
            const msgCount = global.crysStats?.messages || 0;
            const cmdCount = global.crysStats?.commands || 0;

            // Send status message with table
            await sock.sendMessage(message.key.remoteJid, {
                disclaimerText: 'Bot Status',
                headerText: '📊 Bot Health Dashboard ⎔',
                contentText: '## ☕︎ CRYSNOVA AI ˗ˏˋ ☏ ˎˊ˗',
                title: 'Platform Info',
                table: [
                    ['Metric', 'Value'],
                    ['Status', '˗ˏˋ ☏ ˎˊ˗ Online'],
                    ['⩇⩇:⩇⩇', `${days}d ${hours}h ${minutes}m ${seconds}s`],
                    ['Memory', `${usedMemory.toFixed(2)} GB / ${totalMemory.toFixed(2)} GB`],
                    ['CPU Cores', String(os.cpus().length)],
                    ['Platform', `${os.platform()} ${os.arch()}`],
                    ['Commands', String(cmdCount)],   // ← from crysStats
                    ['Messages', String(msgCount)]    // ← from crysStats
                ],
                noHeading: false,
                footerText: '_*( ͡❛ ₃ ͡❛) CRYSN⚉VA AI V2 • Always Online*_'
            }, {
                quoted: message
            });

            // Send success reaction
            await sock.sendMessage(message.key.remoteJid, {
                react: {
                    text: '🫟',
                    key: message.key
                }
            });

        } catch (error) {
            console.error('[STATUS ERROR]', error.message);
            // No fallback reply as requested
        }
    }
};
