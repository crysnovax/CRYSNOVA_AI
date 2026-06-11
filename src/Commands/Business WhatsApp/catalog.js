// ── catalog.js ───────────────────────────────────────────────────
const config = require('../../../settings/config');

const BOT_NAME = config.botname || process.env.BOTNAME || 'CRYSNOVA';

const formatPrice = (price, currency) => {
    if (!price || !currency) return 'Contact for price';
    return `${currency} ${(price / 1000).toLocaleString()}`;
};

const getProductImage = (imageUrls) => {
    return imageUrls?.original || imageUrls?.requested || null;
};

const fetchCatalog = async (sock, jid, limit) => {
    try {
        const result = await sock.getCatalog({ jid, limit });
        if (!Array.isArray(result.products) || result.products.length === 0) return null;
        return result;
    } catch {
        return null;
    }
};

const sendCatalog = async (sock, m, products, nextPageCursor, label, limit) => {
    const cards = products.slice(0, 10).map(p => {
        const imageUrl = getProductImage(p.imageUrls);
        const productUrl = p.url || `https://wa.me/p/${p.id}`;
        const price = formatPrice(p.price, p.currency);

        return {
            image: imageUrl
                ? { url: imageUrl }
                : { url: 'https://via.placeholder.com/400x400/10b981/FFFFFF?text=No+Image' },
            caption: [
                `*${p.name || 'Unnamed Product'}*`,
                `💰 ${price}`,
                p.description ? `📝 ${p.description}` : null,
                `📦 ${p.availability || 'in stock'}`,
                `🆔 ${p.id}`
            ].filter(Boolean).join('\n'),
            footer: `⚉ ${BOT_NAME} Business`,
            nativeFlow: [{
                text: '🛒 View Product',
                url: productUrl
            }, {
                text: '💬 Inquire',
                copy: `Hi! I'm interested in: ${p.name} (ID: ${p.id})`
            }]
        };
    });

    await sock.sendMessage(m.chat, {
        text: `🛒 *${label}*`,
        footer: `Found ${products.length} product${products.length > 1 ? 's' : ''}`,
        cards
    }, { quoted: m });

    if (nextPageCursor) {
        await sock.sendMessage(m.chat, {
            text: `⚉ More available — use *.catalog here ${limit + 10}* to load more`
        });
    }
};

const USAGE = `🛒 *CATALOG USAGE*

⚉ *.catalog* — show this guide
⚉ *.catalog me* — browse my own catalog
⚉ *.catalog here* — browse this contact's catalog (falls back to mine if they have none)

_Works in DMs only_`;

module.exports = {
    name: 'catalog',
    alias: ['products', 'shop', 'store'],
    desc: 'Browse business product catalog',
    category: 'Business',
    usage: '.catalog [me|here] [limit]',

    execute: async (sock, m, { args, reply }) => {
        const sub = args[0]?.toLowerCase();
        const limit = parseInt(args[1]) || 10;

        // ── Usage guide ────────────────────────────────────────────
        if (!sub) return reply(USAGE);

        // ── DM only ────────────────────────────────────────────────
        if (m.chat.endsWith('@g.us')) {
            return reply('✘ DM only — send me a private message to use this command.');
        }

        const myJid = sock.user?.id;
        const chatJid = m.chat;

        await sock.sendMessage(m.chat, { react: { text: '🛒', key: m.key } });

        // ── .catalog me ────────────────────────────────────────────
        if (sub === 'me') {
            const result = await fetchCatalog(sock, myJid, limit);
            if (!result) return reply(`✘ You don't have a catalog yet.\n_Create one in WhatsApp Business settings._`);
            await sendCatalog(sock, m, result.products, result.nextPageCursor, `${BOT_NAME} CATALOG`, limit);
            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        }

        // ── .catalog here ──────────────────────────────────────────
        if (sub === 'here') {
            // Try the chat contact's catalog first
            const theirResult = await fetchCatalog(sock, chatJid, limit);
            if (theirResult) {
                await sendCatalog(sock, m, theirResult.products, theirResult.nextPageCursor, `CATALOG`, limit);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
                return;
            }

            // Fallback to bot's own catalog
            const myResult = await fetchCatalog(sock, myJid, limit);
            if (myResult) {
                await sock.sendMessage(m.chat, {
                    text: `_This contact has no catalog. Showing mine instead._`
                });
                await sendCatalog(sock, m, myResult.products, myResult.nextPageCursor, `${BOT_NAME} CATALOG`, limit);
                await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
                return;
            }

            // Neither has a catalog
            return reply(`✘ No catalog found here, and I don't have one either.`);
        }

        // ── Unknown subcommand ─────────────────────────────────────
        return reply(USAGE);
    }
};
                    
