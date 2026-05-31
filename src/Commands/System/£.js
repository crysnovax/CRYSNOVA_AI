const util = require('util');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

module.exports = {
    name: 'eval',
    alias: ['#', '>'],
    desc: 'Execute JavaScript code or shell commands',
    category: 'Owner',
    ownerOnly: true,

    execute: async (sock, m, { args, reply, text, prefix, command, isOwner, isDual }) => {
        if (!text) return;

        const startTime = Date.now();
        const isShell = command === 'sh';

        // ── Shell execution mode ──
        if (isShell) {
            try {
                const result = execSync(text, {
                    encoding: 'utf8',
                    timeout: 30000,
                    maxBuffer: 1024 * 1024 * 5
                });
                const timeTaken = Date.now() - startTime;
                const output = (result || 'No output').slice(0, 4000);
                return reply(`*☢︎* _(${timeTaken}ms)_\n\`\`\`\n${output}\n\`\`\``);
            } catch (err) {
                const timeTaken = Date.now() - startTime;
                const errOutput = (err.stdout || err.stderr || err.message).slice(0, 4000);
                return reply(`*✘ Shell Error* _(${timeTaken}ms)_\n\`\`\`\n${errOutput}\n\`\`\``);
            }
        }

        // ── JavaScript execution mode ──
        let consoleOutput = '';
        const originalLog   = console.log;
        const originalError = console.error;
        const originalWarn  = console.warn;

        const capture = (prefix) => (...args) => {
            consoleOutput += prefix + args.map(a =>
                typeof a === 'object' ? util.inspect(a, { depth: 3, colors: false }) : String(a)
            ).join(' ') + '\n';
        };

        console.log   = capture('');
        console.error = capture('❌ ');
        console.warn  = capture('⚠️ ');

        try {
            // Helper to send media from eval
            const sendImage = (source, caption = '') => {
                const content = typeof source === 'string' && source.startsWith('http')
                    ? { url: source }
                    : Buffer.isBuffer(source) ? source : fs.readFileSync(source);
                return sock.sendMessage(m.chat, { image: content, caption }, { quoted: m });
            };

            const sendVideo = (source, caption = '') => {
                const content = typeof source === 'string' && source.startsWith('http')
                    ? { url: source }
                    : Buffer.isBuffer(source) ? source : fs.readFileSync(source);
                return sock.sendMessage(m.chat, { video: content, caption }, { quoted: m });
            };

            const sendAudio = (source, ptt = false) => {
                const content = typeof source === 'string' && source.startsWith('http')
                    ? { url: source }
                    : Buffer.isBuffer(source) ? source : fs.readFileSync(source);
                return sock.sendMessage(m.chat, { audio: content, ptt }, { quoted: m });
            };

            const sendFile = (source, filename = 'file') => {
                const content = typeof source === 'string' && source.startsWith('http')
                    ? { url: source }
                    : Buffer.isBuffer(source) ? source : fs.readFileSync(source);
                return sock.sendMessage(m.chat, { document: content, fileName: filename }, { quoted: m });
            };

            const shell = (cmd) => new Promise((resolve, reject) => {
                exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
                    if (err) reject(stderr || err.message);
                    else resolve(stdout);
                });
            });

            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Smart wrap — if multiline or has const/let/var, don't auto-return
            const isMultiLine = text.includes('\n');
            const hasDeclaration = /^\s*(const|let|var|function|class|if|for|while|try|switch)/m.test(text);
            const hasReturn = text.includes('return');
            const hasAwait = text.includes('await');

            let wrappedCode;
            if (isMultiLine || hasDeclaration) {
                // Multi-line or declaration — run as-is, no auto return
                wrappedCode = `(async () => { ${text} })()`;
            } else {
                // Single expression — auto return
                wrappedCode = `(async () => { return ${text} })()`;
            }

            let result = await eval(wrappedCode);

            console.log   = originalLog;
            console.error = originalError;
            console.warn  = originalWarn;

            const timeTaken = Date.now() - startTime;

            // Build output
            let output = '';
            if (consoleOutput) output += consoleOutput.trimEnd();

            if (result !== undefined) {
                const resultStr = typeof result === 'object'
                    ? util.inspect(result, { depth: 3, colors: false })
                    : String(result);
                if (output) output += '\n' + resultStr;
                else output = resultStr;
            }

            // Only reply if there's actual output
            if (output && output.trim() && output.trim() !== 'undefined') {
                reply(`*�* _(${timeTaken}ms)_\n\`\`\`\n${output.slice(0, 4000)}\n\`\`\``);
            } else if (!consoleOutput && result === undefined) {
                // Completely silent — no output at all
                await sock.sendMessage(m.chat, { react: { text: '🐾', key: m.key } }).catch(() => {});
            }

        } catch (err) {
            console.log   = originalLog;
            console.error = originalError;
            console.warn  = originalWarn;

            const timeTaken = Date.now() - startTime;
            let errMsg = err.message || String(err);
            if (consoleOutput) errMsg = consoleOutput.trimEnd() + '\n' + errMsg;

            reply(`*✘ Error* _(${timeTaken}ms)_\n\`\`\`\n${errMsg.slice(0, 4000)}\n\`\`\``);
        }
    }
};
                
