const { randomUUID } = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const CDN_URL = 'https://cdn.crysnovax.link';

async function uploadToCDN(buffer) {
    const form = new FormData();
    form.append('file', buffer, { filename: 'product.jpg', contentType: 'image/jpeg' });
    const res = await axios.post(`${CDN_URL}/upload`, form, {
        headers: form.getHeaders(),
        timeout: 30000
    });
    return res.data?.url || res.data?.link || res.data?.file || null;
}

async function downloadQuoted(quoted) {
    try {
        if (typeof quoted.download === 'function') return await quoted.download();
    } catch (e) {}
    const { downloadContentFromMessage } = require('@crysnovax/baileys-stable');
    const stream = await downloadContentFromMessage(quoted.message.imageMessage, 'image');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = {
    name: 'product',
    alias: ['shop', 'sell', 'catalog'],
    desc: 'Create a product listing with purchase button',
    category: 'Shop',
    usage: '.product <title> | <price> | <description> | <url> (reply to image)',
    reactions: { start: '🛍️', success: '🥏', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const fullText = args.join(' ').trim();
        
        if (!fullText) {
            return reply(
                `╭─❍ *PRODUCT LISTING*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}product <title> | <price> | <desc> | <url>\n│\n` +
                `│ ✪ *Example:*\n` +
                `│ 💱{prefix}product Sticker Pack | 5000 | Premium stickers | https://...\n│\n` +
                `│ 🔖 *Reply to product image!*\n` +
                `╰──────────────────`
            );
        }

        // Parse parameters
        const parts = fullText.split('|').map(p => p.trim());
        const title = parts[0] || 'Product';
        const priceAmount = parseInt(parts[1]?.replace(/[^0-9]/g, '') || '0');
        const description = parts[2] || 'No description';
        const productUrl = parts[3] || 'https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38';

        if (!m.quoted || !m.quoted.message?.imageMessage) {
            return reply('`✘ Reply to a product image`');
        }

        await sock.sendMessage(m.chat, { react: { text: '🛍️', key: m.key } });
        await reply(`\`🛍️ Creating product: "${title}"...\``);

        try {
            // Download & upload product image
            const buffer = await downloadQuoted(m.quoted);
            if (!buffer) return reply('`✘ Failed to download image`');
            
            const imageUrl = await uploadToCDN(buffer);
            if (!imageUrl) return reply('`✘ Failed to upload image`');

            const productId = randomUUID();

            await sock.sendMessage(m.chat, {
                image: { url: imageUrl },
                body: `🛍️ *${title}*\n\n${description}`,
                footer: 'Tap button to purchase',
                product: {
                    currencyCode: 'NGN',
                    description: description,
                    priceAmount1000: priceAmount * 1000,
                    productId: productId,
                    productImageCount: 1,
                    salePriceAmount1000: priceAmount * 1000,
                    signedUrl: productUrl,
                    title: title,
                    url: productUrl
                },
                businessOwnerJid: '0@s.whatsapp.net'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🥏', key: m.key } });

        } catch (error) {
            console.error('[PRODUCT ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply(`\`✘ ${error.message || 'Failed to create product'}\``);
        }
    }
};
