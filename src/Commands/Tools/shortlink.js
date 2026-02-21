// ── plugins/shortlink.js ──
const axios = require('axios');

module.exports = {
 name: 'shortlink',
 alias: ['short', 'linkshort'],
 desc: 'Shorten a URL using is.gd',
 category: 'tools',
 usage: '.short <url>',
 owner: false,

 execute: async (sock, m, { args, reply }) => {
 try {
 const url = args[0];
 if (!url) return reply('⚉ Please provide a URL to shorten\nExample: .short https://example.com');

 const res = await axios.get('https://is.gd/create.php', {
 params: { format: 'json', url }
 });

 if (res.data && res.data.shorturl) {
 return reply(`⚉ Shortened URL:\n\n${res.data.shorturl}`);
 } else {
 return reply('✘ Failed to shorten the URL.');
 }
 } catch (err) {
 console.error('✘ Shortlink Plugin Error:', err.message);
 return reply('✘ Something went wrong while shortening the URL.');
 }
 }
};