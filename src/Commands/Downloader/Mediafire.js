const fetch = require('node-fetch');

module.exports = {
    name: 'mediafire',
    alias: ['mf', 'mfdown'],
    desc: 'Download files from MediaFire links',
    category: 'Download',
     // ⭐ Reaction config
    reactions: {
        start: '🗂️',
        success: '✨'
    },


    execute: async (sock, m, { args, reply, quoted }) => {
        try {
            let url = args[0] || m.quoted?.text;
            if (!url) return reply('𓄄 Provide a MediaFire link');

            await sock.sendPresenceUpdate('composing', m.chat);

            const apiUrl = `https://apis.prexzyvilla.site/download/mediafire?url=${encodeURIComponent(url)}`;

            const res = await fetch(apiUrl);
            if (!res.ok) return reply('⚉ API failed');

            const data = await res.json();

            const fileUrl =
                data?.result?.download ||
                data?.result?.url ||
                data?.download ||
                data?.url;

            const fileName =
                data?.result?.filename ||
                data?.filename ||
                'mediafire_file';

            if (!fileUrl) return reply('✘ Failed to fetch file');

            // send as document
            await sock.sendMessage(m.chat, {
                document: { url: fileUrl },
                fileName: fileName
            }, { quoted: m });

        } catch (err) {
            console.error('[MEDIAFIRE ERROR]', err);
            reply('❌ Failed to download MediaFire file');
        }
    }
};
