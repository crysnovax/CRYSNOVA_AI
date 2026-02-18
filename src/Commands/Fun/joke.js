const jokes = [
    "Why don't scientists trust atoms? Because they make up everything! 😂",
    "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
    "I told my wife she was drawing her eyebrows too high. She looked surprised! 😮",
    "Why can't you give Elsa a balloon? Because she'll let it go! 🎈",
    "What do you call cheese that isn't yours? Nacho cheese! 🧀"
];
module.exports = {
    name: 'joke',
    alias: ['jokes'],
    desc: 'Get a random joke',
    category: 'Fun',
    execute: async (sock, m, { reply }) => {
        await reply(jokes[Math.floor(Math.random() * jokes.length)]);
    }
};
