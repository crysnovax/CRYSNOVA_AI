const axios = require("axios");
const config = require("../../../settings/config");

// Use API base from config (same as other AI tools)
const API_BASE = process.env.TOOLS_API_BASE || config.api?.imageBase || '';

module.exports = {
    name: 'tojs',
    alias: ['toj', 'convertjs', 'jsify'],
    category: 'AI',
    desc: 'Convert any code to clean JavaScript powered by CRYSNOVA',

    execute: async (sock, m, { args, reply, quoted }) => {
        try {
            // Support input from args or quoted message
            let inputCode = args.join(' ');
            if (!inputCode && m.quoted?.text) inputCode = m.quoted.text;
            if (!inputCode) return reply('ಠ_ಠ _*Please provide code to convert (or reply to a message)*_');

            await sock.sendPresenceUpdate('composing', m.chat);
            await sock.sendMessage(m.chat, { react: { text: '🔁', key: m.key } });

            const apiUrl = `${API_BASE}/tojavascript?code=${encodeURIComponent(inputCode)}&from=auto`;
            const response = await axios.get(apiUrl, { timeout: 30000 });

            const data = response.data;
            if (!data.result && !data.code) return reply('✘ Unable to convert code');

            const jsOutput = (data.result || data.code).trim();

            const MAX_CHARS = 4000;
            if (jsOutput.length > MAX_CHARS) {
                const parts = Math.ceil(jsOutput.length / MAX_CHARS);
                for (let i = 0; i < jsOutput.length; i += MAX_CHARS) {
                    const partNum = Math.floor(i / MAX_CHARS) + 1;
                    await sock.sendMessage(m.chat, {
                        text: `𖣘 *CONVERTED JS (${partNum}/${parts})*\n\`\`\`js\n${jsOutput.slice(i, i + MAX_CHARS)}\n\`\`\`\n_⚉ CRYSNOVA_`
                    }, { quoted: m });
                }
            } else {
                await sock.sendMessage(m.chat, {
                    text: `𖣘 *CONVERTED JAVASCRIPT*\n\`\`\`js\n${jsOutput}\n\`\`\`\n_⚉ CRYSNOVA_`
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });

        } catch (err) {
            console.error('[TOJS ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '✘', key: m.key } });
            reply('✘ Failed to convert code');
        }
    }
};
