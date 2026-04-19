module.exports = {
    name: 'joke',
    alias: ['jokes', 'tellmeajoke'],
    desc: 'Get a random joke',
    category: 'Fun',
    reactions: { start: '🤣', success: '😂' },

    execute: async (sock, m, { reply, args }) => {
        let category = 'Any';
        let lang = 'en';
        
        // Parse arguments: .joke [category] [lang]
        if (args[0]) {
            const validCategories = ['programming', 'misc', 'dark', 'pun', 'spooky', 'christmas'];
            if (validCategories.includes(args[0].toLowerCase())) {
                category = args[0].toLowerCase();
            }
        }
        if (args[1]) {
            const validLangs = ['en', 'es', 'fr', 'de', 'pt', 'cs', 'fi'];
            if (validLangs.includes(args[1].toLowerCase())) {
                lang = args[1].toLowerCase();
            }
        }

        const apiUrl = `https://v2.jokeapi.dev/joke/${category}?lang=${lang}&safe-mode&blacklistFlags=nsfw,religious,political`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.error) return reply('`ಠ_ಠ No joke found!`');

            let jokeText = `🤣 *JOKE*\n\n`;
            if (data.type === 'single') {
                jokeText += data.joke;
            } else {
                jokeText += `*${data.setup}*\n\n${data.delivery}`;
            }

            await reply(jokeText);
        } catch (error) {
            await reply('🤣 Why did the API fail? It needed a break! 😅');
        }
    }
};
