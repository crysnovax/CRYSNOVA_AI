const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  command: 'image',
  alias: ['img', 'pic', 'imagine'],
  description: 'Premium image search from Unsplash (high quality)',
  category: 'tools',

  execute: async (sock, m, { args, reply }) => {
    if (!args.length) return reply('⚠ Provide a search term\nExample: .image blue whale ocean');

    const rawQuery = args.join(' ').trim();
    const enhancedQuery = `${rawQuery} high quality photo`; // smart boost for better results

    try {
      // Start processing reaction
      await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } });

      const query = encodeURIComponent(enhancedQuery);
      const unsplashUrl = `https://unsplash.com/s/photos/${query}`;

      const { data } = await axios.get(unsplashUrl, {
        headers: { 'User-Agent': 'CRYSNOVA-BOT/1.0' }
      });

      const $ = cheerio.load(data);
      const images = [];

      // Extract high-res images from srcset
      $('img[srcset]').each((i, el) => {
        const srcset = $(el).attr('srcset');
        if (!srcset) return;

        // Split and get the largest resolution URL
        const candidates = srcset.split(',').map(part => part.trim().split(' ')[0]);
        const hiRes = candidates[candidates.length - 1]; // last one is usually highest res

        if (hiRes && hiRes.startsWith('https://') && !images.includes(hiRes)) {
          images.push(hiRes);
        }
      });

      if (images.length === 0) {
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return reply('✘ No high-quality images found. Try a different query.');
      }

      // Pick one from top 5 (random for variety)
      const selectedUrl = images[Math.floor(Math.random() * Math.min(5, images.length))];

      // Send image with caption
      await sock.sendMessage(m.chat, {
        image: { url: selectedUrl },
        caption: `📷 Premium Unsplash result for: *${rawQuery}*`
      }, { quoted: m });

      // Success reaction
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (err) {
      console.error('Image search error:', err.message);
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      reply('𓉤 Failed to fetch image. Try again or rephrase query.');
    }
  }
};
