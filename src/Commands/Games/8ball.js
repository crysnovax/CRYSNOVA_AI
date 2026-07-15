const ANSWERS = [
    'Yes, definitely! ✅', 'It is certain ✨', 'Without a doubt 💯',
    'Yes, absolutely 🌟', 'You may rely on it 👍', 'As I see it, yes 👀',
    'Most likely 🎯', 'Outlook good 🌈', 'Signs point to yes 👆',
    'Reply hazy, try again 🤷', 'Ask again later ⏰', 'Better not tell you now 🤫',
    'Cannot predict now 🔮', 'Concentrate and ask again 🧘', 'Don\'t count on it 🤔',
    'My reply is no ❌', 'My sources say no 📡', 'Very doubtful 🧐'
];

module.exports = {
    name: '8ball',
    alias: ['8ball', 'magic8', 'fortune'],
    desc: 'Ask the Magic 8-Ball a question',
    category: 'Games',
    usage: `${prefix}8ball <your question>`,
    reactions: { start: '🎱', success: '🎭', error: '🏗️' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const question = args.join(' ').trim();
        
        if (!question) {
            return reply(
                `╭─❍ *MAGIC 8-BALL*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}8ball <question>\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}8ball Will I be rich?\n` +
                `│ ${prefix}8ball Should I go out?\n│\n` +
                `│ 🎱 *The magic 8-ball knows all*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '🎱', key: m.key } });

        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];

        await sock.sendMessage(m.chat, {
            headerText: `## 🎱 Magic 8-Ball`,
            contentText: '---',
            title: '🔮 The Spirits Say...',
            table: [
                ['❓ Your Question', question],
                ['🎱 Answer', answer]
            ],
            footerText: '💡 .8ball <question> to ask again!'
        }, { quoted: m });

        await sock.sendMessage(m.chat, { react: { text: '🎭', key: m.key } });
    }
};
