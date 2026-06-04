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
                return reply(`*�* _(${timeTaken}ms)_\n\`\`\`\n${output}\n\`\`\``);
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
                wrappedCode = `(async () => { ${text} })()`;
            } else {
                wrappedCode = `(async () => { return ${text} })()`;
            }

            let result = await eval(wrappedCode);

            console.log   = originalLog;
            console.error = originalError;
            console.warn  = originalWarn;

            const timeTaken = Date.now() - startTime;

            // ── SMART FILTER: ONLY filter obvious WhatsApp send responses ──
            function isWhatsAppSendResponse(result) {
                if (!result) return false;
                
                // Check if it's a reaction message response
                if (result.message?.reactionMessage) return true;
                
                // Check if it's a sendMessage response with key but no meaningful data
                if (result.key && result.messageTimestamp && !result.conversation && !result.text) {
                    return true;
                }
                
                return false;
            }
            
            // ── CHECK IF USER WANTS RAW OUTPUT (by adding .raw to the command) ──
            const wantsRaw = text.includes('.raw') || text.includes('//raw');
            
            // Build output
            let output = '';
            if (consoleOutput) output += consoleOutput.trimEnd();
            
            // Handle result
            const isSendResponse = !wantsRaw && isWhatsAppSendResponse(result);
            
            if (isSendResponse) {
                // Filter out WhatsApp send responses - just react silently
            //    await sock.sendMessage(m.chat, { react: { text: '🍁', key: m.key } }).catch(() => {});
                // Don't show any output
                if (!consoleOutput) return;
            } else if (result !== undefined) {
                // Show result normally (including m.quoted, m.isGroup, etc.)
                let resultStr;
                
                if (Buffer.isBuffer(result)) {
                    resultStr = `<Buffer ${result.length} bytes>`;
                } else if (typeof result === 'function') {
                    resultStr = `[Function: ${result.name || 'anonymous'}]`;
                } else if (typeof result === 'object') {
                    // Always show objects properly - this includes m.quoted, m.chat, etc.
                    resultStr = util.inspect(result, { 
                        depth: wantsRaw ? 5 : 3, 
                        colors: false, 
                        maxArrayLength: wantsRaw ? 50 : 20,
                        breakLength: wantsRaw ? 80 : 60
                    });
                    
                    // Truncate only if extremely long
                    if (resultStr.length > 8000) {
                        resultStr = resultStr.slice(0, 8000) + '\n... (truncated)';
                    }
                } else {
                    resultStr = String(result);
                }
                
                if (output) output += '\n' + resultStr;
                else output = resultStr;
            }
            
            // Send response if there's output
            if (output && output.trim() && output.trim() !== 'undefined') {
                const finalOutput = output.slice(0, 4000);
                await reply(`*✆ Result* _(${timeTaken}ms)_\n\`\`\`\n${finalOutput}\n\`\`\``);
            } else if (!consoleOutput && (result === undefined || isSendResponse)) {
                // Silent operation
                if (!isSendResponse) {
                    await sock.sendMessage(m.chat, { react: { text: '🐾', key: m.key } }).catch(() => {});
                }
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
