const axios = require("axios");
const config = require("../../../settings/config");

// Use AI base from config (same as image APIs)
const AI_BASE = process.env.AI_API_BASE || config.api?.imageBase || '';

module.exports = {
    name: 'story',
    alias: ['advai', 'smartgen', 'aipro'],
    category: 'AI',
    desc: 'Advanced storytelling AI powered by CRYSNOVA',

    execute: async (sock, m, { args, reply }) => {
        try {
            if (!args.length) {
                return reply(`ಠ_ಠ *STORYTELLING AI*\n\nUsage:\n.story <prompt>\n.story creative <prompt>\n.story short <prompt>\n.story long <prompt>`);
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

            const userQuery = textArgs.join(' ').trim();
            if (!userQuery) return reply('✘ Give a valid story prompt');

            await sock.sendPresenceUpdate('composing', m.chat);
            await sock.sendMessage(m.chat, { react: { text: '📖', key: m.key } });

            // ─── STORYTELLING TRAINING PROMPT ─────────────────────────────
            const TRAINING_PROMPT = `You are a master storyteller and creative writer. Your task is to craft engaging, vivid, and well-structured stories based on the user's request. Use descriptive language, maintain a consistent tone, and create memorable characters and settings. Adapt the story length and style according to any specified requirements.

User request: ${userQuery}

Story:`;

            // Build URL with parameters
            let apiUrl = `${AI_BASE}/advanced?text=${encodeURIComponent(TRAINING_PROMPT)}`;
            if (length !== 'medium') apiUrl += `&length=${length}`;
            if (isCreative) apiUrl += `&creative=true`;

            const response = await axios.get(apiUrl, { timeout: 60000 });
            const json = response.data;

            // Deep search for text content (same robust extraction)
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
                return reply('✘ Could not generate story');
            }

            await sock.sendMessage(m.chat, {
                text: `𖣘 *STORYTELLING AI*\n\n⎙ Length: ${length.toUpperCase()}${isCreative ? ' • Creative' : ''}\n\n${result}\n\n_⚉ CRYSNOVA Gateway_`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✓', key: m.key } });

        } catch (err) {
            console.error('[STORY ERROR]', err.message);
            reply('✘ Failed to generate story');
        }
    }
};
