module.exports = {

    name: 'ping',

    alias: ['speed', 'test', 'latency'],

    desc: 'Check bot response speed',

    category: 'Bot',

    execute: async (sock, m, { reply }) => {

        const start = Date.now();

        // Optional: short loading message (uncomment if you want a two-step feel)

        // await reply('✪ _Pinging_...');

        const latency = Date.now() - start;

        // Get current time in WAT (West Africa Time) format like your example

        const now = new Date();

        const timeString = now.toLocaleTimeString('en-US', {

            hour: 'numeric',

            minute: '2-digit',

            second: '2-digit',

            hour12: true

        }).toLowerCase(); // makes it like 4:25:54pm

        // Exact format you requested

        const pingText =

`╭─❍ *PONG!*
│ ❏ ${latency}ms
│ ⚉  _online_
╰─ 𓄄 \`\`\`${timeString}\`\`\``;

        await reply(pingText);

    }

};