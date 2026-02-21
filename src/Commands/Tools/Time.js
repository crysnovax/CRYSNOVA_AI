const moment = require('moment-timezone');

module.exports = {

    name: 'tm',

    alias: ['clock', 'nigtime'],

    desc: 'Get current Nigerian time',

    category: 'tools',

    usage: '.time',

    owner: false,

    execute: async (sock, m, { reply }) => {

        try {

            const nigTime = moment().tz('Africa/Lagos').format('dddd, MMMM Do YYYY, HH:mm:ss');

            await reply(`🕒 Current Nigerian time:\n${nigTime}`);

        } catch (err) {

            console.error('[TIME PLUGIN ERROR]', err.message);

            await reply('❌ Could not fetch time right now.');

        }

    }

};