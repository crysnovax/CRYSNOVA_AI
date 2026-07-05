const axios = require('axios');
const config = require('../../../settings/config');

const GATEWAY_URL = config.api?.gateway || 'https://api.crysnovax.link';
const GATEWAY_TOKEN = config.api?.gatewayToken || '';

// Prexzy — primary for now, no key required
const PREXZY_URL = 'https://prexzyapis.com/ai/prompttocode';
const DEFAULT_LANGUAGE = 'JavaScript';

async function askPrexzy(prompt, language) {
    const res = await axios.get(PREXZY_URL, {
        params: { prompt, language },
        timeout: 60000
    });

    const data = res.data;

    if (data?.status && data?.code) {
        return { code: data.code, title: data.title, language: data.language };
    }

    throw new Error('Prexzy response missing code');
}

async function askGateway(prompt) {
    const res = await axios.get(`${GATEWAY_URL}/ai/code-advanced`, {
        params: { token: GATEWAY_TOKEN, text: prompt },
        timeout: 60000
    });

    const data = res.data;

    let code = data?.code || data?.result || data?.response || data?.output || data?.text || data;

    if (typeof code === 'object' && code !== null) {
        code = code.content || code.code || code.result || JSON.stringify(code, null, 2);
    }

    if (!code || code === '[object Object]') {
        throw new Error('Gateway response had no usable code');
    }

    return { code, title: null, language: null };
}

module.exports = {
    name: 'codeai',
    alias: ['advancedcode', 'codegen'],
    desc: 'Generate advanced code with AI',
    category: 'AI',
    usage: '.codeai <prompt> [| language]',

    execute: async (sock, m, { args, reply }) => {
        const raw = args.join(' ').trim();
        if (!raw) return reply('ಠ_ಠ _*Describe the code you need*_');

        // Optional "| language" suffix, e.g. ".codeai sort a list | Python"
        let prompt = raw;
        let language = DEFAULT_LANGUAGE;
        const pipeIndex = raw.lastIndexOf('|');
        if (pipeIndex !== -1) {
            const possibleLang = raw.slice(pipeIndex + 1).trim();
            if (possibleLang) {
                prompt = raw.slice(0, pipeIndex).trim();
                language = possibleLang;
            }
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: '💻', key: m.key } });

            let result = null;
            let source = 'CRYSNOVA Gateway';

            // ── PRIMARY: Prexzy ──
            try {
                result = await askPrexzy(prompt, language);
                source = 'Prexzy';
            } catch (err) {
                console.error('[CODEAI] Prexzy failed, falling back to gateway:', err.message);
            }

            // ── FALLBACK: Gateway ──
            if (!result) {
                try {
                    result = await askGateway(prompt);
                } catch (err) {
                    console.error('[CODEAI] Gateway also failed:', err.message);
                }
            }

            if (!result) {
                await sock.sendMessage(m.chat, { react: { text: '✘', key: m.key } });
                return reply('✘ No code generated.');
            }

            const heading = result.title ? `𖣘 *${result.title}*` : '𖣘 *CODE GENERATOR*';
            const langTag = result.language ? result.language.toLowerCase() : '';

            await sock.sendMessage(m.chat, {
                text: `${heading}\n\n\`\`\`${langTag}\n${result.code}\n\`\`\`\n\n_⚉`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🍁', key: m.key } });
        } catch (err) {
            console.error('[CODEAI]', err.message);
            reply('✘ Code generation failed');
        }
    }
};
