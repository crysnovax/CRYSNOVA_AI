module.exports = {
    name: 'dice',
    alias: ['roll'],
    desc: 'Roll a dice',
    category: 'Fun',
    execute: async (sock, m, { reply }) => {
        const result = Math.floor(Math.random() * 6) + 1;
        const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        await reply(`🎲 You rolled: *${result}* ${faces[result]}`);
    }
};
