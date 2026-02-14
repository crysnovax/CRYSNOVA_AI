const moment = require('moment');

module.exports = {
  command: 'time',
  owner: true,
  execute: async (sock, m, { reply }) => {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    await reply(`™✓ Package works!\nCurrent time: ${now}`);
  }
};
