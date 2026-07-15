const { fetchGifUrl, reactionConfig } = require('../Core/ⓘ.js');

/**
 * Resolve the reaction target from either a mention (@tag) or a
 * replied/quoted message. Returns { jid, tag } or null when no target.
 */
function resolveTarget(m) {
    // 1) Prefer an explicit @mention
    const mentioned =
        m.mentionedJid ||
        m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        [];
    if (Array.isArray(mentioned) && mentioned.length > 0) {
        const jid = mentioned[0];
        return { jid, tag: '@' + jid.split('@')[0] };
    }

    // 2) Fall back to the author of a replied/quoted message
    const quotedJid =
        m.quoted?.sender ||
        m.message?.extendedTextMessage?.contextInfo?.participant ||
        null;
    if (quotedJid) {
        return { jid: quotedJid, tag: '@' + quotedJid.split('@')[0] };
    }

    return null;
}

function createReactionCommand(name, config) {
    return {
        name,
        alias: [name],
        category: 'fun',
        execute: async (sock, m, { reply }) => {
            try {
                const pushName = m.pushName || 'Someone';
                const target = resolveTarget(m);

                let caption;
                let hasTarget = true;

                if (config.needTarget) {
                    if (target) {
                        caption = config.msgTarget(pushName, target.tag);
                    } else {
                        caption = config.msgNoTarget;
                        hasTarget = false;
                    }
                } else {
                    caption = config.msgSelf(pushName);
                }

                if (!hasTarget) return reply(caption);

                // Only mention the resolved target (works for both tag + reply)
                const mentions = target ? [target.jid] : [];

                const gifUrl = await fetchGifUrl(name + ' anime');
                if (!gifUrl) return reply(caption + '\n\n_⚠︎ GIF not found_');

                await sock.sendMessage(
                    m.key.remoteJid,
                    {
                        video: { url: gifUrl },
                        gifPlayback: true,
                        caption,
                        mentions
                    },
                    { quoted: m }
                );
            } catch (err) {
                console.error('Reaction Error (' + name + '):', err.message);
                reply('ⓘ Reaction failed.');
            }
        }
    };
}

const allReactions = Object.entries(reactionConfig).map(([name, config]) =>
    createReactionCommand(name, config)
);

module.exports = allReactions;
