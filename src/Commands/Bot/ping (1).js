module.exports = {
    name: 'ping',
    alias: ['speed', 'test', 'latency'],
    desc: 'Check bot response speed',
    category: 'Bot',
     // ⭐ Reaction config
    reactions: {
        start: '♻️',
        success: '✨'
    },
    

    execute: async (sock, m, { reply }) => {
        const start = Date.now();

        // Create real delay: send a quick message + typing indicator
        await sock.sendPresenceUpdate('composing', m.key.remoteJid);
        await sock.sendMessage(m.key.remoteJid, {
            text: '✪ _Pinging..._'
        }, { quoted: m });

        const latency = Date.now() - start;

        // Real Nigerian time (WAT / Africa/Lagos)
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Africa/Lagos'  // ← This forces correct WAT time
        }).toLowerCase(); // → e.g. 11:52:06pm

        // Your exact format
        const pingText = `╭─❍ *PONG!*
│ ❏ ${latency}ms
│ ⚉  _online_
╰─ 𓄄 \`\`\`${timeString}\`\`\``;

        await reply(pingText);

        // Reset presence
        await sock.sendPresenceUpdate('available', m.key.remoteJid);
    }
};