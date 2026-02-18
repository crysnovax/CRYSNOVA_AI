module.exports = {
    name: 'eval',
    alias: ['ev', '>'],
    desc: 'Execute JavaScript code',
    category: 'Owner',
    ownerOnly: true,
    execute: async (sock, m, { text, reply }) => {
        if (!text) return reply('Usage: .eval <code>');
        try {
            const res = await eval(text);
            const out = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
            await reply(`✅ Result:\n\`\`\`\n${out}\n\`\`\``);
        } catch (e) {
            await reply(`❌ Error:\n\`\`\`\n${e.message}\n\`\`\``);
        }
    }
};
