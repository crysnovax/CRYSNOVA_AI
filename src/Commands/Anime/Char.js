const axios = require('axios');

module.exports = {
    name: "char",
    alias: ["char","aimg"],
    desc: "Search anime characters & images",
    category: "anime",

    async execute(sock, m, { args, reply }) {
        try {
            if (!args.length) {
                return reply('_*✘ Example: .anime Naruto*_');
            }

            const query = args.join(' ');
            await reply(`🔍 Searching for *${query}*...`);

            // ───── CHARACTER SEARCH (JIKAN) ─────
            const charRes = await axios.get(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=5`);

            if (!charRes.data?.data?.length) {
                return reply('_*𓄄 Character not found!*_');
            }

            // pick random character
            const char = charRes.data.data[Math.floor(Math.random() * charRes.data.data.length)];

            const name = char.name;
            const about = char.about?.slice(0, 300) || 'No description';
            const fav = char.favorites || 0;
            const img = char.images?.jpg?.image_url;

            // ───── IMAGE SEARCH (DANBOORU RANDOM) ─────
            const imgRes = await axios.get(`https://danbooru.donmai.us/posts.json`, {
                params: {
                    tags: `${query} rating:safe`,
                    limit: 5
                }
            });

            let randomImage = img;

            if (imgRes.data?.length) {
                const pick = imgRes.data[Math.floor(Math.random() * imgRes.data.length)];
                randomImage = pick.file_url || pick.large_file_url || img;
            }

            const caption = 
`✨ *${name}*

👍 Favorites: ${fav}

📖 ${about}...

🎭 Search: ${query}`;

            await sock.sendMessage(m.chat, {
                image: { url: randomImage },
                caption
            }, { quoted: m });

        } catch (err) {
            console.log('[ANIME ERROR]', err.message);
            reply('❌ Failed to fetch anime data.');
        }
    }
};