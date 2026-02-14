const axios = require('axios');

module.exports = {
  command: 'axios',
  owner: true,
  execute: async (sock, m, { reply }) => {
    const res = await axios.get('https://api.github.com');
    reply(`Status: ${res.status}`);
  }
};
