const axios = require('axios');

const { getVar } = require('../../Plugin/configManager');

module.exports = {

    name: 'ai',

    alias: ['gpt', 'ask', 'grok'],

    desc: 'Talk to AI (Grok powered)',

    category: 'AI',

    execute: async (sock, m, { text, reply, config }) => {

        if (!text) return reply('✘ Ask me something!\nExample: .ai What is the capital of Nigeria?');

        await reply('_✪ Processing your request..._');

        try {

            // Use your runtime variable exactly

            const grokKey = getVar('QROK_KEY');  

            if (!grokKey) return reply('✘ Grok API key not set!\nUse: .setvar QROK_KEY=your_key');

            const res = await axios.post('https://api.grok.ai/v1/chat/completions', {

                model: 'grok-3.5',

                messages: [

                    { role: 'system', content: 'You are CRYSNOVA AI, a professional and intelligent WhatsApp assistant. Be helpful, concise, and accurate.' },

                    { role: 'user', content: text }

                ],

                max_tokens: 1000

            }, {

                headers: { Authorization: `Bearer ${grokKey}`, 'Content-Type': 'application/json' }

            });

            const answer = res.data.choices?.[0]?.message?.content || 'No response from AI.';

            await reply(`🤖 *CRYSNOVA AI*\n\n${answer}`);

        } catch (e) {

            console.log(e?.message || e);

            await reply('✘ AI service temporarily unavailable!\nCheck your QROK_KEY or try again later.');

        }

    }

};