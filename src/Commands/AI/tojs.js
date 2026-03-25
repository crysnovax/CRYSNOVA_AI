const fetch = require('node-fetch');

module.exports = {
    name: 'tojs',
    alias: ['toj', 'convertjs', 'jsify'],
    desc: 'Convert any code from any language to clean JavaScript',
    category: 'AI',

    execute: async (sock, m, { args, reply, quoted }) => {
        try {
            // Support input from args or quoted message
            let inputCode = args.join(' ');
            if (!inputCode && m.quoted?.text) inputCode = m.quoted.text;
            if (!inputCode) return reply('𓉤 Please provide code to convert (or reply to a message)');

            await sock.sendPresenceUpdate('composing', m.chat);

            // Encode input for API
            const apiUrl = `https://apis.prexzyvilla.site/tools/tojavascript?code=${encodeURIComponent(inputCode)}&from=auto`;

            const apiRes = await fetch(apiUrl);
            if (!apiRes.ok) return reply(`⚉ API failed: ${apiRes.status}`);

            const data = await apiRes.json();
            if (!data.result && !data.code) return reply('✘ Unable to convert code');

            const jsOutput = (data.result || data.code).trim();

            // Handle very long output by splitting if > 4000 chars
            const MAX_CHARS = 4000;
            if (jsOutput.length > MAX_CHARS) {
                for (let i = 0; i < jsOutput.length; i += MAX_CHARS) {
                    await sock.sendMessage(m.chat, {
                        text: `🧠 *Converted JS (part ${i / MAX_CHARS + 1}):*\n\`\`\`js\n${jsOutput.slice(i, i + MAX_CHARS)}\n\`\`\``
                    }, { quoted: m });
                }
            } else {
                await sock.sendMessage(m.chat, {
                    text: `🧠 *Converted JavaScript:*\n\`\`\`js\n${jsOutput}\n\`\`\``
                }, { quoted: m });
            }

        } catch (err) {
            console.error('[TOJS ERROR]', err);
            reply('𓉤 Failed to convert to JavaScript');
        }
    }
};
