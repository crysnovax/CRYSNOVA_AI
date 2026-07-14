const USER_JID_SUFFIX = '@s.whatsapp.net';

function normalizeUserJid(value = '') {
    const jid = typeof value === 'string'
        ? value
        : value.phoneNumber || value.jid || value.id || '';
    if (!jid) return null;

    if (jid.endsWith(USER_JID_SUFFIX)) {
        const number = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
        return number ? `${number}${USER_JID_SUFFIX}` : null;
    }

    const phoneNumber = typeof value === 'object' ? value.phoneNumber : '';
    if (phoneNumber) {
        const number = phoneNumber.replace(/\D/g, '');
        return number ? `${number}${USER_JID_SUFFIX}` : null;
    }

    return null;
}

function getStatusRecipients(store, ownJid = '') {
    const contacts = store?.contacts;
    const entries = contacts instanceof Map
        ? [...contacts.entries()]
        : Object.entries(contacts || {});
    const own = normalizeUserJid(ownJid);
    const recipients = new Set();

    for (const [key, contact] of entries) {
        const jid = normalizeUserJid(contact) || normalizeUserJid(key);
        if (jid && jid !== own) recipients.add(jid);
    }

    return [...recipients];
}

function getQuotedType(quoted = {}) {
    const type = quoted.mtype || quoted.type || '';
    if (type.includes('image')) return 'image';
    if (type.includes('video')) return 'video';
    if (type.includes('audio')) return 'audio';
    return null;
}

async function buildStoryContent(m, text) {
    const quoted = m.quoted;
    const mediaType = getQuotedType(quoted);

    if (!mediaType) {
        const storyText = text || quoted?.text || quoted?.caption || '';
        return storyText ? { text: storyText } : null;
    }

    if (typeof quoted.download !== 'function') {
        throw new Error('The replied media cannot be downloaded.');
    }

    const media = await quoted.download();
    if (!media?.length) throw new Error('The replied media download was empty.');

    if (mediaType === 'image') {
        return { image: media, caption: text || quoted.caption || quoted.text || '' };
    }
    if (mediaType === 'video') {
        return { video: media, caption: text || quoted.caption || quoted.text || '' };
    }
    return {
        audio: media,
        mimetype: quoted.mimetype || 'audio/mpeg',
        ptt: false,
    };
}

const plugin = {
    name: 'poststory',
    alias: ['poststatus', 'storypost'],
    desc: 'Post text or replied media to the bot account WhatsApp story',
    category: 'Owner',
    ownerOnly: true,
    usage: '.poststory <text> or reply to an image, video, audio, or text',

    execute: async (sock, m, { text, reply, store }) => {
        try {
            const recipients = getStatusRecipients(store, sock.user?.id);
            if (!recipients.length) {
                return reply('No valid WhatsApp contacts are available for the story audience. Sync contacts and try again.');
            }

            const content = await buildStoryContent(m, text);
            if (!content) {
                return reply('Usage: .poststory <text>, or reply to an image, video, audio, or text message.');
            }

            await sock.sendMessage('status@broadcast', {
                ...content,
                status: true,
                statusJidList: recipients,
            });

            const type = content.image ? 'image' : content.video ? 'video' : content.audio ? 'audio' : 'text';
            return reply(`WhatsApp ${type} story posted to ${recipients.length} contact${recipients.length === 1 ? '' : 's'}.`);
        } catch (error) {
            console.error('[POSTSTORY ERROR]', error?.stack || error?.message || error);
            return reply(`Could not post the WhatsApp story: ${error?.message || 'unknown error'}`);
        }
    },
};

plugin.normalizeUserJid = normalizeUserJid;
plugin.getStatusRecipients = getStatusRecipients;
plugin.buildStoryContent = buildStoryContent;

module.exports = plugin;
