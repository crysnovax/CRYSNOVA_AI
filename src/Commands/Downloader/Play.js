const axios = require('axios');

const yts = require('yt-search');

module.exports = {

    name: 'play',

    alias: ['song'],

    desc: 'Download song from YouTube',

    category: 'downloader',

    usage: '.play <song name>',

    owner: true,
     // ⭐ Reaction config
    reactions: {
        start: '🎙️',
        success: '✨'
    },
    

    execute: async (sock, m, { args, reply }) => {

        const query = args.join(' ');

        if (!query) return reply('Provide a song name.');

        await reply('🔎 _*Searching...*_');

        try {

            const search = await yts(query);

            const video = search.videos[0];

            if (!video) return reply('⚉*Song not found.*');

            await reply(`🎵 Found: ${video.title}`);

            const apiUrl = `https://api.vevioz.com/api/button/mp3/${video.videoId}`;

            // Fetch as buffer

            const response = await axios.get(apiUrl, {

                responseType: 'arraybuffer',

                timeout: 60000

            });

            const buffer = Buffer.from(response.data);

            await sock.sendMessage(m.key.remoteJid, {

                audio: buffer,

                mimetype: 'audio/mpeg',

                fileName: `${video.title}.mp3`

            }, { quoted: m });

        } catch (err) {

            console.log('[PLAY ERROR]', err.response?.status || err.message);

            reply('✘_*Download failed. API may be down.*_');

        }

    }

};
