const axios = require('axios');

function chunkText(text, size = 3500) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
    return chunks;
}

function isJsPrompt(text = '') {
    const t = text.toLowerCase().trim();
    return (
        t.includes('javascript') ||
        t.includes('node') ||
        t.includes('node.js') ||
        t.includes('js ') ||
        t.startsWith('js') ||
        t.includes('baileys') ||
        t.includes('command') ||
        t.includes('bot') ||
        t.includes('whatsapp') ||
        t.includes('module.exports') ||
        t.includes('require(') ||
        t.includes('sock.sendmessage')
    );
}

function stripMarkdown(text = '') {
    return String(text)
        .replace(/^```(?:js|javascript)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function extractPureCode(text = '') {
    text = stripMarkdown(text);

    const lines = text.split('\n');
    let start = lines.findIndex(line => /^(const|let|var|async function|function|class|module\.exports\b)/.test(line.trim()));

    const moduleIndex = lines.findIndex(line => /module\.exports\s*=/.test(line));
    if (moduleIndex !== -1) {
        const requireIndex = lines.findIndex((line, i) => i <= moduleIndex && /^(const|let|var)\s+\w+\s*=\s*require\(/.test(line.trim()));
        if (requireIndex !== -1) start = requireIndex;
        else if (start === -1) start = moduleIndex;
    }

    if (start > 0) text = lines.slice(start).join('\n').trim();

    return text.trim();
}

function looksLikeCommandCode(text = '') {
    const t = String(text);
    return /module\.exports\s*=/.test(t) && /execute\s*:\s*async/.test(t);
}

function buildSuperPrompt(task) {
    return [
        'CRYSNOVA AI SUPER MODE',
        'Return only raw JavaScript code.',
        'No explanation.',
        'No markdown.',
        'No backticks.',
        'No notes.',
        'No intro text.',
        'No usage guide.',
        'No comments.',
        'The reply must be a complete runnable bot command file.',
        'The first line of the reply must start with const or module.exports.',
        'Use CommonJS only.',
        'Use this exact compatible structure:',
        "module.exports = {",
        "    name: '',",
        "    alias: [],",
        "    desc: '',",
        "    category: '',",
        "    execute: async (sock, m, { text, reply, args, prefix, command }) => {",
        "    }",
        "};",
        'If the request is for JavaScript, Node.js, Baileys, WhatsApp, or bot features, output only one command module compatible with my AI.',
        'TASK:',
        task
    ].join('\n');
}

function buildRepairPrompt(task, badOutput) {
    return [
        'CRYSNOVA AI SUPER MODE REPAIR',
        'Your last reply was invalid because it included explanation or non-code text.',
        'Return only raw JavaScript code.',
        'No explanation.',
        'No markdown.',
        'No backticks.',
        'No comments.',
        'Output only one complete runnable command module.',
        'The first line must start with const or module.exports.',
        'Use CommonJS only.',
        'Use this exact structure:',
        "module.exports = {",
        "    name: '',",
        "    alias: [],",
        "    desc: '',",
        "    category: '',",
        "    execute: async (sock, m, { text, reply, args, prefix, command }) => {",
        "    }",
        "};",
        'ORIGINAL TASK:',
        task,
        'INVALID OUTPUT TO FIX:',
        badOutput
    ].join('\n');
}

async function requestCode(prompt) {
    const url = `https://apis.prexzyvilla.site/ai/code-advanced?text=${encodeURIComponent(prompt)}`;
    return axios.get(url, {
        headers: { Accept: 'application/json' },
        timeout: 120000,
        validateStatus: () => true
    });
}

module.exports = {
    name: 'code',
    alias: ['aicode', 'codex', 'dev'],
    desc: 'Advanced AI coder powered by Crysnova AI',
    category: 'ai',

    execute: async (sock, m, { text, reply }) => {
        try {
            if (!text) {
                return reply('✘ Provide a coding prompt');
            }

            await sock.sendMessage(m.chat, {
                react: { text: '💻', key: m.key }
            });

            const superMode = isJsPrompt(text);
            const firstPrompt = superMode ? buildSuperPrompt(text) : text;

            let res = await requestCode(firstPrompt);
            let data = res.data || {};

            if (res.status !== 200) {
                await sock.sendMessage(m.chat, {
                    react: { text: '😞', key: m.key }
                });
                return reply(`✘ API request failed (${res.status})`);
            }

            if (!data?.status || !data?.response) {
                await sock.sendMessage(m.chat, {
                    react: { text: '🤧', key: m.key }
                });
                return reply('✘ Failed to generate code');
            }

            let result = typeof data.response === 'string'
                ? data.response
                : JSON.stringify(data.response, null, 2);

            result = extractPureCode(result);

            if (superMode && !looksLikeCommandCode(result)) {
                const retryRes = await requestCode(buildRepairPrompt(text, result));
                const retryData = retryRes.data || {};

                if (retryRes.status === 200 && retryData?.status && retryData?.response) {
                    const repaired = extractPureCode(
                        typeof retryData.response === 'string'
                            ? retryData.response
                            : JSON.stringify(retryData.response, null, 2)
                    );

                    if (repaired) result = repaired;
                }
            }

            result = extractPureCode(result);

            if (superMode && !looksLikeCommandCode(result)) {
                await sock.sendMessage(m.chat, {
                    react: { text: '😞', key: m.key }
                });
                return reply('✘ API returned non-command output');
            }

            await sock.sendMessage(m.chat, {
                react: { text: '🤖', key: m.key }
            });

            const parts = chunkText(result, 3500);

            for (const part of parts) {
                await sock.sendMessage(m.chat, {
                    text: part
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, {
                react: { text: '👾', key: m.key }
            });
        } catch (err) {
            console.log('CODE CMD ERROR:', err?.message);
            console.log('STATUS:', err?.response?.status);
            console.log('DATA:', err?.response?.data);

            await sock.sendMessage(m.chat, {
                react: { text: '😞', key: m.key }
            });

            const errorMsg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Unknown error';

            reply(`✘ Error generating code\n${errorMsg}`);
        }
    }
};

