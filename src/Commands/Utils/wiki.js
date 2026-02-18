const axios = require('axios');

module.exports = {

    name: 'wiki',

    alias: ['wikipedia', 'wikisearch', 'wp'],

    desc: 'Premium Wikipedia search with summary, image, link, and reactions',

    category: 'tools',

    ownerOnly: true, // owner-only command

    usage: '.wiki <term>',

    execute: async (sock, m, { args, reply }) => {

        if (!args.length) return reply('𓉤 Please provide a search term\nExample: .wiki dragons');

        try {

            const query = args.join(' ');

            // Step 1: Search Wikipedia

            const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {

                params: {

                    action: 'query',

                    list: 'search',

                    srsearch: query,

                    srlimit: 1,

                    format: 'json'

                },

                headers: { 'User-Agent': 'CRYSNOVA-AI-BOT/2.0' },

                timeout: 10000

            });

            const result = searchRes.data.query?.search?.[0];

            if (!result) {

                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});

                return reply(`✘𓄄 No results found for "${query}"`);

            }

            const pageTitle = result.title;

            // Step 2: Fetch summary

            const summaryRes = await axios.get(

                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,

                { headers: { 'User-Agent': 'CRYSNOVA-AI-BOT/2.0' }, timeout: 10000 }

            );

            const data = summaryRes.data;

            const title = data.title || pageTitle;

            const description = data.extract || 'No description available.';

            const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

            const imgUrl = data.originalimage?.source || data.thumbnail?.source || null;

            const author = 'Wikipedia';

            // Step 3: Reactions (V2 style)

            const reactEmojis = ['✅', '📚', '⚡', '📝', '🔍'];

            for (const emoji of reactEmojis) {

                await sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {});

            }

            // Step 4: Caption

            const caption = `

┏━━━━━━━━━━〔 ⚉ WIKIPEDIA RESULT ⚉ 〕━━━━━━━━┓

┃

┃  🏷️ Title  : ${title}

┃  📝 Summary: ${description}

┃  📎 Link   : ${pageUrl}

┃  🖋 Author : ${author}

┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

            `;

            // Step 5: Send image if available

            if (imgUrl) {

                await sock.sendMessage(m.chat, {

                    image: { url: imgUrl },

                    caption,

                    contextInfo: {

                        externalAdReply: {

                            title: "CRYSNOVA WIKI",

                            body: author,

                            mediaUrl: pageUrl,

                            thumbnailUrl: imgUrl

                        }

                    }

                }, { quoted: m });

            } else {

                await reply(caption);

            }

        } catch (err) {

            console.error('Wiki plugin error:', err.message);

            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});

            return reply('✘⚉ Error fetching Wikipedia info');

        }

    }

};