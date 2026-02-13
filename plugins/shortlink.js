const fetch = require('node-fetch');

module.exports = {
  command: 'short',
  alias: ['shorten', 'linkshort'],
  description: 'Shorten a URL quickly',
  category: 'utility',

  execute: async (sock, m, { reply, text }) => {
    try {
      if (!text) return reply('Please provide a URL to shorten.\nUsage: .short https://example.com');

      // Validate URL
      try {
        new URL(text);
      } catch {
        return reply('Invalid URL. Make sure it starts with https:// or http://');
      }

      // Call is.gd API
      const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(text)}`);
      const shortUrl = await res.text();

      reply(`🔗 Shortened URL:\n${shortUrl}`);
    } catch (err) {
      console.error('Shortener plugin error:', err);
      reply('✘ Failed to shorten the URL. Try again later.𓉤');
    }
  }
};
