const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'poststatus',
    alias: ['pstatus', 'addstatus', 'setstatus'],
    desc: 'Post media or text to bot\'s WhatsApp status',
    category: 'Owner',
    usage: '.pstatus <caption> (reply to media)  OR  .pstatus <text>',

    execute: async (sock, m, { args, reply, quoted }) => {
        const caption = args.join(' ').trim();

        // Case 1: Replying to media (image/video)
        if (quoted) {
            const mtype = quoted.mtype;
            const isMedia = mtype === 'imageMessage' || mtype === 'videoMessage';

            if (!isMedia) {
                return reply('_Reply to an image or video to post as status._');
            }

            try {
                await sock.sendMessage(m.chat, { react: { text: '📤', key: m.key } });

                // Download the media
                const buffer = await quoted.download();
                if (!buffer) return reply('✘ Failed to download media');

                const type = mtype === 'imageMessage' ? 'image' : 'video';
                const options = {};
                if (caption) options.caption = caption;
                if (type === 'video') options.mimetype = 'video/mp4';

                // Send to status
                await sock.sendMessage('status@broadcast', {
                    [type]: buffer,
                    ...options
                });

                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                reply('`✓ Status posted successfully`');

            } catch (err) {
                console.error('[PSTATUS ERROR]', err);
                reply('✘ Failed to post status');
            }
            return;
        }

        // Case 2: Text status (no media)
        if (!caption) {
            return reply(
                `𖣘 *POST STATUS*\n\n` +
                `Usage:\n` +
                `.pstatus <text>          → Post text status\n` +
                `.pstatus <caption>        → Reply to image/video to post with caption`
            );
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: '📤', key: m.key } });

            // Post text status
            await sock.sendMessage('status@broadcast', {
                text: caption
            });

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            reply('`✓ Text status posted`');

        } catch (err) {
            console.error('[PSTATUS ERROR]', err);
            reply('✘ Failed to post text status');
        }
    }
};
