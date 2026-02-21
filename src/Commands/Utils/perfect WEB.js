// ── CRYSNOVA AI V3 SMART SEARCH ENGINE ──
const axios = require('axios');
const cheerio = require('cheerio');

// API Keys (hardcode or use config)
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Optional: for better results
const GOOGLE_CX = 'YOUR_CUSTOM_SEARCH_ENGINE_ID'; // Optional

module.exports = {
    name: 'web',
    alias: ['search', 'google', 'lookup', 'find'],
    category: 'tools',
    owner: false,
    desc: 'Smart web search with AI query detection',

    execute: async (sock, m, { args, reply, prefix }) => {
        if (!args.length) {
            return reply(
`*🌐 CRYSNOVA SMART SEARCH*

*Usage:*
${prefix}web <query>

*Examples:*
${prefix}web life pictures of antelopes in Australia
${prefix}web Donald Trump
${prefix}web current crisis
${prefix}web weather in Tokyo
${prefix}web latest iPhone price

*Smart Detection:*
• Images → Auto-fetches image results
• News → Gets latest articles
• Weather → Live weather data
• Price/Product → Shopping results
• Person → Knowledge panel
• General → Best match results`
            );
        }

        const query = args.join(' ');
        const queryLower = query.toLowerCase();

        // React loading
        await sock.sendMessage(m.chat, { 
            react: { text: '🔍', key: m.key } 
        });

        try {
            // ── SMART QUERY DETECTION ──
            const intent = detectIntent(queryLower);
            let results;

            switch (intent) {
                case 'image':
                    results = await searchImages(query);
                    break;
                case 'news':
                    results = await searchNews(query);
                    break;
                case 'weather':
                    results = await searchWeather(query);
                    break;
                case 'definition':
                    results = await searchDefinition(query);
                    break;
                case 'price':
                case 'product':
                    results = await searchProduct(query);
                    break;
                case 'person':
                    results = await searchPerson(query);
                    break;
                case 'location':
                    results = await searchLocation(query);
                    break;
                default:
                    results = await searchGeneral(query);
            }

            // Send formatted results
            await sendResults(sock, m, query, results, intent);

        } catch (error) {
            console.error('[WEB SEARCH ERROR]', error);
            await reply(`❌ Search failed: ${error.message}\n\nTry again with a more specific query.`);
        }
    }
};

// ── INTENT DETECTION ──
function detectIntent(query) {
    // Image detection
    if (/\b(pictures?|images?|photos?|pics?|wallpaper|gif|memes?)\b/.test(query)) {
        return 'image';
    }

    // News detection
    if (/\b(news|latest|update|breaking|headlines?|today|current)\b/.test(query)) {
        return 'news';
    }

    // Weather detection
    if (/\b(weather|temperature|forecast|rain|sunny|climate)\b/.test(query)) {
        return 'weather';
    }

    // Definition/Wiki detection
    if (/^(what is|who is|define|meaning of|wiki|wikipedia)\b/.test(query) || 
        /\b(definition|meaning|wiki)\b/.test(query)) {
        return 'definition';
    }

    // Price/Product detection
    if (/\b(price|cost|buy|cheap|expensive|amazon|ebay|shop|product)\b/.test(query) ||
        /\$\d|\bdollars?\b|\beuros?\b/.test(query)) {
        return 'price';
    }

    // Person detection (famous people, celebrities)
    if (/\b(trump|biden|elon musk|celebrity|actor|president|ceo|founder)\b/.test(query) ||
        /^who is\b/.test(query)) {
        return 'person';
    }

    // Location detection
    if (/\b(in|at|near|location|city|country|place|map|directions?)\b/.test(query) &&
        /\b(australia|usa|uk|japan|london|paris|tokyo|new york)\b/.test(query)) {
        return 'location';
    }

    return 'general';
}

// ── SEARCH FUNCTIONS ──

// 1. IMAGE SEARCH
async function searchImages(query) {
    try {
        // Using Bing Image Search (scraping)
        const searchQuery = encodeURIComponent(query);
        const url = `https://www.bing.com/images/search?q=${searchQuery}`;
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(data);
        const images = [];

        $('.mimg').each((i, el) => {
            if (i >= 5) return false;
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && src.startsWith('http')) {
                images.push(src);
            }
        });

        // Fallback to placeholder if no images found
        if (images.length === 0) {
            // Try alternative image source
            return {
                type: 'image',
                images: ['https://via.placeholder.com/400x300?text=No+Images+Found'],
                query: query
            };
        }

        return {
            type: 'image',
            images: images,
            query: query
        };

    } catch (error) {
        // Fallback to general search with image hint
        return {
            type: 'image',
            images: [],
            fallback: true,
            query: query
        };
    }
}

// 2. NEWS SEARCH
async function searchNews(query) {
    try {
        // Using Bing News
        const searchQuery = encodeURIComponent(query.replace(/\b(news|latest|current)\b/gi, '').trim());
        const url = `https://www.bing.com/news/search?q=${searchQuery}`;
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(data);
        const articles = [];

        $('.news-card, .newsitem, [data-testid="news-headline"]').each((i, el) => {
            if (i >= 5) return false;
            
            const title = $(el).find('a').text().trim() || $(el).find('.title').text().trim();
            const link = $(el).find('a').attr('href');
            const snippet = $(el).find('.snippet, .description').text().trim();
            const source = $(el).find('.source, .provider').text().trim();

            if (title && link) {
                articles.push({
                    title: title.substring(0, 100),
                    url: link.startsWith('http') ? link : `https://www.bing.com${link}`,
                    snippet: snippet?.substring(0, 150) || 'No description',
                    source: source || 'Unknown'
                });
            }
        });

        // Alternative selector
        if (articles.length === 0) {
            $('.title').each((i, el) => {
                if (i >= 5) return false;
                const title = $(el).text().trim();
                const link = $(el).parent('a').attr('href');
                if (title) {
                    articles.push({
                        title: title.substring(0, 100),
                        url: link || '#',
                        snippet: 'News article',
                        source: 'News'
                    });
                }
            });
        }

        return {
            type: 'news',
            articles: articles,
            query: query
        };

    } catch (error) {
        return {
            type: 'news',
            articles: [],
            error: error.message,
            query: query
        };
    }
}

// 3. WEATHER SEARCH
async function searchWeather(query) {
    try {
        // Extract location from query
        const location = query.replace(/\b(weather|temperature|forecast|in|at)\b/gi, '').trim();
        
        // Using wttr.in (free weather API)
        const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
        
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'curl' }
        });

        const current = data.current_condition[0];
        const area = data.nearest_area[0];

        return {
            type: 'weather',
            location: `${area.areaName[0].value}, ${area.country[0].value}`,
            temp: current.temp_C,
            feelsLike: current.FeelsLikeC,
            condition: current.weatherDesc[0].value,
            humidity: current.humidity,
            wind: current.windspeedKmph,
            visibility: current.visibility,
            query: query
        };

    } catch (error) {
        // Fallback to general search
        return {
            type: 'weather',
            location: query.replace(/\b(weather|in)\b/gi, '').trim(),
            error: 'Weather data unavailable',
            query: query
        };
    }
}

// 4. DEFINITION/WIKI SEARCH
async function searchDefinition(query) {
    try {
        // Clean query
        const term = query.replace(/\b(what is|who is|define|meaning of|wiki)\b/gi, '').trim();
        
        // Wikipedia API
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
        
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'CRYSNOVA-AI/1.0' }
        });

        return {
            type: 'definition',
            title: data.title,
            extract: data.extract,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${term}`,
            image: data.thumbnail?.source,
            query: query
        };

    } catch (error) {
        // Fallback to dictionary API
        try {
            const term = query.replace(/\b(what is|define|meaning of)\b/gi, '').trim();
            const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
            
            const { data } = await axios.get(dictUrl);
            const entry = data[0];

            return {
                type: 'definition',
                title: entry.word,
                extract: entry.meanings[0]?.definitions[0]?.definition || 'No definition found',
                phonetic: entry.phonetic,
                url: `https://en.wiktionary.org/wiki/${term}`,
                query: query
            };
        } catch {
            return {
                type: 'definition',
                title: term,
                extract: 'Definition not found. Try searching on Google.',
                url: `https://www.google.com/search?q=define+${encodeURIComponent(term)}`,
                query: query
            };
        }
    }
}

// 5. PRODUCT/PRICE SEARCH
async function searchProduct(query) {
    try {
        // Google Shopping or similar
        const searchQuery = encodeURIComponent(query);
        const url = `https://www.google.com/search?tbm=shop&q=${searchQuery}`;
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.sh-dgr__grid-result, .pslires').each((i, el) => {
            if (i >= 5) return false;
            
            const title = $(el).find('h3, .pymv4e').text().trim();
            const price = $(el).find('.a8Pemb, .e10twf').text().trim();
            const link = $(el).find('a').attr('href');

            if (title) {
                products.push({
                    title: title.substring(0, 80),
                    price: price || 'Price not shown',
                    url: link?.startsWith('http') ? link : `https://www.google.com${link}`
                });
            }
        });

        return {
            type: 'product',
            products: products,
            query: query
        };

    } catch (error) {
        return {
            type: 'product',
            products: [],
            fallback: true,
            query: query
        };
    }
}

// 6. PERSON SEARCH
async function searchPerson(query) {
    try {
        // Try Wikipedia first for notable people
        const term = query.replace(/\b(who is)\b/gi, '').trim();
        
        try {
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
            const { data } = await axios.get(wikiUrl, {
                headers: { 'User-Agent': 'CRYSNOVA-AI/1.0' }
            });

            if (data.type === 'standard' || data.type === 'disambiguation') {
                return {
                    type: 'person',
                    name: data.title,
                    description: data.extract,
                    image: data.thumbnail?.source,
                    url: data.content_urls?.desktop?.page,
                    isPerson: true,
                    query: query
                };
            }
        } catch (e) {
            // Not found on Wikipedia, continue to general search
        }

        // Fallback to general knowledge
        return await searchGeneral(query, true);

    } catch (error) {
        return await searchGeneral(query, true);
    }
}

// 7. LOCATION SEARCH
async function searchLocation(query) {
    try {
        // Using OpenStreetMap (Nominatim)
        const location = query.replace(/\b(location|map|in|at|near)\b/gi, '').trim();
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
        
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'CRYSNOVA-AI/1.0' }
        });

        if (data && data.length > 0) {
            const place = data[0];
            return {
                type: 'location',
                name: place.display_name,
                lat: place.lat,
                lon: place.lon,
                type: place.type,
                importance: place.importance,
                mapUrl: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=15/${place.lat}/${place.lon}`,
                query: query
            };
        }

        throw new Error('Location not found');

    } catch (error) {
        return {
            type: 'location',
            name: query,
            error: 'Location details unavailable',
            mapUrl: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
            query: query
        };
    }
}

// 8. GENERAL SEARCH (Fallback)
async function searchGeneral(query, isPerson = false) {
    try {
        // DuckDuckGo HTML version or Bing
        const searchQuery = encodeURIComponent(query);
        const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.result').each((i, el) => {
            if (i >= 5) return false;
            
            const title = $(el).find('.result__a').text().trim();
            const url = $(el).find('.result__a').attr('href');
            const snippet = $(el).find('.result__snippet').text().trim();

            if (title) {
                results.push({
                    title: title.substring(0, 100),
                    url: url?.startsWith('http') ? url : `https://duckduckgo.com${url}`,
                    snippet: snippet?.substring(0, 200) || 'No description available'
                });
            }
        });

        // If DuckDuckGo fails, try Bing
        if (results.length === 0) {
            const bingUrl = `https://www.bing.com/search?q=${searchQuery}`;
            const bingData = await axios.get(bingUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            
            const $$ = cheerio.load(bingData.data);
            $$('.b_algo').each((i, el) => {
                if (i >= 5) return false;
                
                const title = $$(el).find('h2 a').text().trim();
                const url = $$(el).find('h2 a').attr('href');
                const snippet = $$(el).find('.b_caption p').text().trim();

                if (title) {
                    results.push({
                        title: title.substring(0, 100),
                        url: url,
                        snippet: snippet?.substring(0, 200) || 'No description'
                    });
                }
            });
        }

        return {
            type: isPerson ? 'person' : 'general',
            results: results,
            query: query
        };

    } catch (error) {
        return {
            type: 'general',
            results: [],
            error: error.message,
            query: query,
            fallbackUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`
        };
    }
}

// ── RESULT FORMATTER ──
async function sendResults(sock, m, query, results, intent) {
    const { type } = results;

    switch (type) {
        case 'image':
            await sendImageResults(sock, m, results);
            break;
        case 'news':
            await sendNewsResults(sock, m, results);
            break;
        case 'weather':
            await sendWeatherResults(sock, m, results);
            break;
        case 'definition':
            await sendDefinitionResults(sock, m, results);
            break;
        case 'product':
            await sendProductResults(sock, m, results);
            break;
        case 'person':
            await sendPersonResults(sock, m, results);
            break;
        case 'location':
            await sendLocationResults(sock, m, results);
            break;
        default:
            await sendGeneralResults(sock, m, results);
    }
}

// ── SEND FUNCTIONS ──

async function sendImageResults(sock, m, data) {
    if (data.images && data.images.length > 0) {
        // Send first image with caption
        await sock.sendMessage(m.chat, {
            image: { url: data.images[0] },
            caption: `🖼️ *Image Search: ${data.query}*\n\nFound ${data.images.length} images\n\nPowered by CRYSNOVA AI`,
            contextInfo: {
                externalAdReply: {
                    title: "CRYSNOVA Image Search",
                    body: data.query,
                    thumbnailUrl: data.images[0],
                    sourceUrl: `https://www.bing.com/images/search?q=${encodeURIComponent(data.query)}`,
                    mediaType: 1
                }
            }
        }, { quoted: m });

        // Send remaining images as album if more than 1
        if (data.images.length > 1) {
            const album = data.images.slice(1, 4).map(url => ({
                image: { url: url },
                caption: ''
            }));
            
            for (const img of album) {
                await sock.sendMessage(m.chat, img);
            }
        }
    } else {
        await reply(`🖼️ No images found for "${data.query}"\n\nTry: https://www.google.com/search?tbm=isch&q=${encodeURIComponent(data.query)}`);
    }
}

async function sendNewsResults(sock, m, data) {
    if (!data.articles || data.articles.length === 0) {
        return reply(`📰 No news found for "${data.query}"`);
    }

    let text = `📰 *NEWS: ${data.query.toUpperCase()}*\n\n`;
    
    data.articles.forEach((article, i) => {
        text += `${i + 1}. *${article.title}*\n`;
        text += `   📝 ${article.snippet}\n`;
        text += `   🔗 ${article.url}\n`;
        text += `   📌 ${article.source}\n\n`;
    });

    text += `_Powered by CRYSNOVA AI_`;

    await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: "CRYSNOVA News",
                body: `Latest: ${data.query}`,
                thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/2965/2965879.png",
                sourceUrl: `https://www.bing.com/news/search?q=${encodeURIComponent(data.query)}`,
                mediaType: 1
            }
        }
    }, { quoted: m });
}

async function sendWeatherResults(sock, m, data) {
    if (data.error) {
        return reply(`🌤️ Weather data unavailable for "${data.location}"\n\nTry checking a weather website directly.`);
    }

    const text = `🌤️ *WEATHER: ${data.location}*

🌡️ Temperature: ${data.temp}°C
🤔 Feels Like: ${data.feelsLike}°C
☁️ Condition: ${data.condition}
💧 Humidity: ${data.humidity}%
💨 Wind: ${data.wind} km/h
👁️ Visibility: ${data.visibility} km

_Powered by CRYSNOVA AI_`;

    await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: `${data.temp}°C - ${data.condition}`,
                body: data.location,
                thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
                sourceUrl: `https://wttr.in/${encodeURIComponent(data.location)}`,
                mediaType: 1
            }
        }
    }, { quoted: m });
}

async function sendDefinitionResults(sock, m, data) {
    let text = `📚 *${data.title?.toUpperCase()}*\n\n`;
    text += `${data.extract}\n\n`;
    
    if (data.phonetic) {
        text += `🔊 Pronunciation: ${data.phonetic}\n`;
    }
    
    text += `🔗 Read more: ${data.url}\n\n`;
    text += `_Powered by CRYSNOVA AI_`;

    const message = {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: data.title,
                body: "Knowledge Panel",
                thumbnailUrl: data.image || "https://cdn-icons-png.flaticon.com/512/2965/2965278.png",
                sourceUrl: data.url,
                mediaType: 1
            }
        }
    };

    if (data.image) {
        message.image = { url: data.image };
    }

    await sock.sendMessage(m.chat, message, { quoted: m });
}

async function sendProductResults(sock, m, data) {
    if (!data.products || data.products.length === 0) {
        return reply(`🛒 No products found for "${data.query}"\n\nTry: https://www.google.com/search?tbm=shop&q=${encodeURIComponent(data.query)}`);
    }

    let text = `🛒 *SHOPPING: ${data.query.toUpperCase()}*\n\n`;
    
    data.products.forEach((product, i) => {
        text += `${i + 1}. *${product.title}*\n`;
        text += `   💰 ${product.price}\n`;
        text += `   🔗 ${product.url}\n\n`;
    });

    text += `_Powered by CRYSNOVA AI_`;

    await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: "CRYSNOVA Shopping",
                body: `Best prices for ${data.query}`,
                thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/1170/1170678.png",
                sourceUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(data.query)}`,
                mediaType: 1
        }
        }
    }, { quoted: m });
}

async function sendPersonResults(sock, m, data) {
    let text = `👤 *${data.name?.toUpperCase()}*\n\n`;
    text += `${data.description || data.results?.[0]?.snippet}\n\n`;
    
    if (data.url) {
        text += `🔗 More info: ${data.url}\n`;
    }
    
    text += `\n_Powered by CRYSNOVA AI_`;

    const message = {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: data.name,
                body: "Biography & Info",
                thumbnailUrl: data.image || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                sourceUrl: data.url || `https://www.google.com/search?q=${encodeURIComponent(data.name)}`,
                mediaType: 1
            }
        }
    };

    if (data.image) {
        message.image = { url: data.image };
    }

    await sock.sendMessage(m.chat, message, { quoted: m });
}

async function sendLocationResults(sock, m, data) {
    const text = `📍 *LOCATION: ${data.name}*

🗺️ Type: ${data.type}
⭐ Importance: ${(data.importance * 100).toFixed(1)}%
🌐 Coordinates: ${data.lat}, ${data.lon}

🔗 View on Map: ${data.mapUrl}

_Powered by CRYSNOVA AI_`;

    await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: data.name,
                body: `${data.type} - OpenStreetMap`,
                thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                sourceUrl: data.mapUrl,
                mediaType: 1
            }
        }
    }, { quoted: m });
}

async function sendGeneralResults(sock, m, data) {
    if (!data.results || data.results.length === 0) {
        return reply(`🔍 No results found for "${data.query}"\n\nTry searching on Google:\nhttps://www.google.com/search?q=${encodeURIComponent(data.query)}`);
    }

    let text = `🔍 *SEARCH: ${data.query.toUpperCase()}*\n\n`;
    
    data.results.forEach((result, i) => {
        text += `${i + 1}. *${result.title}*\n`;
        text += `   ${result.snippet}\n`;
        text += `   🔗 ${result.url}\n\n`;
    });

    text += `_Powered by CRYSNOVA AI_`;

    await sock.sendMessage(m.chat, {
        text: text,
        contextInfo: {
            externalAdReply: {
                title: "CRYSNOVA Search",
                body: `Results for: ${data.query}`,
                thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/2965/2965278.png",
                sourceUrl: data.fallbackUrl || `https://www.google.com/search?q=${encodeURIComponent(data.query)}`,
                mediaType: 1
            }
        }
    }, { quoted: m });
}
