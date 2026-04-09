const axios = require("axios");
const config = require("../../../settings/config");

// Use AI base from config (same as image APIs, since it's the same provider)
const AI_BASE = process.env.AI_API_BASE || config.api?.imageBase || '';

module.exports = {
    name: 'story',
    alias: ['advai', 'smartgen', 'aipro'],
    category: 'AI',
    desc: 'Advanced AI text generation with modes powered by CRYSNOVA',

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args.length) {
                return reply(`ಠ_ಠ *ADVANCED AI*\n\nUsage:\n.story <text>\n.story creative <text>\n.story short <text>\n.story long <text>`);
            }

            let length = 'medium';
            let isCreative = false;

            const flags = ['creative', 'short', 'medium', 'long'];
            let textArgs = [...args];

            while (textArgs.length > 0 && flags.includes(textArgs[0].toLowerCase())) {
                const flag = textArgs.shift().toLowerCase();
                if (['short', 'medium', 'long'].includes(flag)) length = flag;
                if (flag === 'creative') isCreative = true;
            }

            const text = textArgs.join(' ').trim();
            if (!text) return reply('✘ Give a valid text prompt');

            await sock.sendPresenceUpdate('composing', m.chat);
            await sock.sendMessage(m.chat, { react: { text: '🧠', key: m.key } });

            // Build URL with parameters
            let apiUrl = `${AI_BASE}/advanced?text=${encodeURIComponent(text)}`;
            if (length !== 'medium') apiUrl += `&length=${length}`;
            if (isCreative) apiUrl += `&creative=true`;

            const response = await axios.get(apiUrl, { timeout: 60000 });
            const json = response.data;

            // Deep search for any text content (same logic as original)
            let result = null;
            if (typeof json === 'string') {
                result = json;
            } else {
                const paths = ['story', 'result', 'response', 'text', 'output', 'message', 'content', 'data', 'answer', 'generated', 'reply'];
                for (const path of paths) {
                    if (json[path]) {
                        result = json[path];
                        break;
                    }
                }
                if (!result && typeof json === 'object') {
                    const values = Object.values(json);
                    for (const val of values) {
                        if (typeof val === 'string' && val.length > 50) {
                            result = val;
                            break;
                        }
                    }
                }
            }

            if (typeof result === 'object' && result !== null) {
                const innerPaths = ['story', 'text', 'content', 'message', 'response'];
                for (const path of innerPaths) {
                    if (result[path]) {
                        result = result[path];
                        break;
                    }
                }
                if (typeof result === 'object') result = JSON.stringify(result);
            }

            if (!result || result === '[object Object]' || result.length < 10) {
                console.log('[STORY] Full response:', JSON.stringify(json));
                return reply('✘ Could not extract text from response');
            }

            await sock.sendMessage(m.chat, {
                text: `𖣘 *ADVANCED AI*\n\n⎙ Length: ${length.toUpperCase()}${isCreative ? ' • Creative' : ''}\n\n${result}\n\n_⚉ CRYSNOVA Gateway_`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });

        } catch (err) {
            console.error('[STORY ERROR]', err.message);
            reply('✘ Failed to generate text');
        }
    }
};
