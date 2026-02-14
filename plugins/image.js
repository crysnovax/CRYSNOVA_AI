const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  command: 'image',
  alias: ['img', 'imagesearch'],
  description: 'Search and send an image from Unsplash (free, no API key)',
  category: 'tools',
  owner: true,

  execute: async (sock, m, { args, reply }) => {
    if (!args.length) return reply('⚠ Please provide a search term\nExample: .image cats');

    try {
      const query = encodeURIComponent(args.join(' '));
      const url = `https://unsplash.com/s/photos/${query}`;

      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'CRYSNOVA-BOT/1.0' }
      });

      const $ = cheerio.load(data);
      const images = [];

      $('img[srcset]').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !images.includes(src)) images.push(src);
      });

      if (!images.length) return reply('✘ No images found.');

      // Pick random image from first 10 results
      const imageUrl = images[Math.floor(Math.random() * Math.min(10, images.length))];

      await sock.sendMessage(m.chat, {
        image: { url: imageUrl },
        caption: `📷 Result for: ${args.join(' ')}`
      }, { quoted: m });

    } catch (err) {
      console.error('Image plugin error:', err.message);
      reply('𓉤 Error fetching image.');
    }
  }
};
