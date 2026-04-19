module.exports = {
    name: 'joke',
    alias: ['jokes', 'tellmeajoke', 'funnystuff'],
    desc: 'Get a random joke from the internet',
    category: 'Fun',
    reactions: { start: '🤣', success: '😂' },

    execute: async (sock, m, { reply, args }) => {
        // Check for category argument
        const category = args[0]?.toLowerCase();
        const validCategories = ['programming', 'misc', 'dark', 'pun', 'spooky', 'christmas'];
        
        let apiUrl = 'https://v2.jokeapi.dev/joke/Any?safe-mode';
        
        // Add category if specified and valid
        if (category && validCategories.includes(category)) {
            apiUrl = `https://v2.jokeapi.dev/joke/${category}?safe-mode`;
        }
        
        // Add blacklist flags to filter out unwanted content
        apiUrl += '&blacklistFlags=nsfw,religious,political,racist,sexist,explicit';

        try {
            // Fetch joke from API
            const response = await fetch(apiUrl);
            const data = await response.json();

            let jokeText = '';

            if (data.error) {
                return reply('_*ಠ_ಠ No joy!.Try again later!*_');
            }

            // Handle different joke types
            if (data.type === 'single') {
                // Single line joke
                jokeText = `🤣 *JOKE*\n\n${data.joke}`;
            } else if (data.type === 'twopart') {
                // Two-part joke (setup + delivery)
                jokeText = `🤣 *JOKE*\n\n*Q:* ${data.setup}\n\n*A:* ${data.delivery}`;
            }

            // Add category if available
            if (data.category) {
                jokeText += `\n\n📌 *Category:* ${data.category}`;
            }

            await reply(jokeText);

        } catch (error) {
            console.error('[JOKE API ERROR]', error.message);
            
            // Fallback jokes if API fails
            const fallbackJokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
                "What's a computer's favorite beat? An algo-rhythm! 🎵",
                "Why did the developer go broke? He used up all his cache! 💸",
                "I told my computer I needed a break... now it won't stop sending me vacation ads! 🏖️",
                "What do you call a fake noodle? An impasta! 🍝"
            ];
            
            const randomJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
            await reply(`🤣 *JOKE* (offline mode)\n\n${randomJoke}\n\n⚠️ API unavailable, using backup jokes.`);
        }
    }
};
