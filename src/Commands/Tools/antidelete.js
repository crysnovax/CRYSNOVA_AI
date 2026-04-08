const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '../../database/antidelete.json');

if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');

const getDB = () => JSON.parse(fs.readFileSync(DB));
const saveDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

function getTime(timestamp) {
    const d = new Date(timestamp * 1000);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
}

function getDisplayName(deleted, senderJid) {
    if (deleted.pushName) return deleted.pushName;
    return senderJid.split('@')[0];
}

function getMessageContent(msgObj) {
    if (msgObj.conversation) {
        return { text: msgObj.conversation, type: 'text' };
    }
    if (msgObj.extendedTextMessage?.text) {
        return { text: msgObj.extendedTextMessage.text, type: 'text' };
    }
    if (msgObj.imageMessage) {
        const cap = msgObj.imageMessage.caption || '';
        return { text: cap ? `[Image] ${cap}` : '[Image] (no caption)', type: 'image' };
    }
    if (msgObj.videoMessage) {
        const cap = msgObj.videoMessage.caption || '';
        return { text: cap ? `[Video] ${cap}` : '[Video] (no caption)', type: 'video' };
    }
    if (msgObj.stickerMessage) {
        return { text: '[Sticker]', type: 'sticker' };
    }
    if (msgObj.audioMessage) {
        return { text: '[Voice message]', type: 'audio' };
    }
    if (msgObj.documentMessage) {
        const name = msgObj.documentMessage.fileName || 'document';
        return { text: `[Document] ${name}`, type: 'document' };
    }
    if (msgObj.contactMessage) {
        const name = msgObj.contactMessage.displayName || 'contact';
        return { text: `[Contact] ${name}`, type: 'contact' };
    }
    if (msgObj.locationMessage) {
        return { text: '[Location]', type: 'location' };
    }
    return { text: '[Unsupported message]', type: 'unknown' };
}

module.exports = {
    name: 'antidelete',
    alias: ['deletedetect'],
    category: 'tools',
    desc: 'Forward deleted message text/caption to owner DM with names',

    execute: async (sock, m, { args, reply }) => {
        const db   = getDB();
        const chat = m.chat;
        const sub  = args[0]?.toLowerCase();
        const sub2 = args[1]?.toLowerCase();

        if (!sub) {
            const status     = db[chat] ? 'ON' : 'OFF';
            const globalPriv = db._globalPriv ? 'ON' : 'OFF';
            const mode       = db._mode || 'dm';
            return reply(
                `╭─❍ *ANTI-DELETE* 𓉤\n` +
                `│ Status     : *${status}*\n` +
                `│ Global DMs : *${globalPriv}*\n` +
                `│ Send to    : *${mode.toUpperCase()}*\n` +
                `│\n` +
                `│ Commands:\n` +
                `│ .antidelete on\n` +
                `│ .antidelete off\n` +
                `│ .antidelete on all\n` +
                `│ .antidelete off all\n` +
                `│ .antidelete mode dm\n` +
                `│ .antidelete mode chat\n` +
                `╰────────────────`
            );
        }

        // .antidelete on
        if (sub === 'on' && !sub2) {
            db[chat] = true;
            saveDB(db);
            return reply('`—͟͟͞͞𖣘 ENABLED CHECK DM`');
        }

        // .antidelete on all
        if (sub === 'on' && sub2 === 'all') {
            db._globalPriv = true;
            saveDB(db);
            return reply('`—͟͟͞͞𖣘 ENABLED for all private chats`');
        }

        // .antidelete off
        if (sub === 'off' && !sub2) {
            delete db[chat];
            saveDB(db);
            return reply('`⟁⃝✘ Anti-delete DISABLED`');
        }

        // .antidelete off all
        if (sub === 'off' && sub2 === 'all') {
            db._globalPriv = false;
            saveDB(db);
            return reply('`⟁⃝✘ Anti-delete DISABLED for all private chats`');
        }

        // .antidelete mode dm | chat
        if (sub === 'mode') {
            if (!sub2 || !['dm', 'chat'].includes(sub2)) {
                return reply('_⚉ Use .antidelete mode dm or .antidelete mode chat_');
            }
            db._mode = sub2;
            saveDB(db);
            return reply(
                sub2 === 'dm'
                    ? '`—͟͟͞͞𖣘 Deleted messages → sent to your DM`'
                    : '`—͟͟͞͞𖣘 Deleted messages → sent back to the same chat`'
            );
        }

        reply('_⚉ Unknown. Use .antidelete on/off_');
    }
};

module.exports.onDelete = async (sock, update, store) => {
    try {
        const db = getDB();

        for (const msg of update) {
            if (msg.update?.message === null) {
                const chat    = msg.key.remoteJid;
                const isGroup = chat.includes('@g.us');
                const isPrivate = !isGroup;

                // Check if enabled for this chat or globally for private chats
                const enabledForChat    = !!db[chat];
                const enabledGlobally   = isPrivate && !!db._globalPriv;

                if (!enabledForChat && !enabledGlobally) continue;

                const deleted = await store.loadMessage(chat, msg.key.id);
                if (!deleted) continue;

                const owner    = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const msgObj   = deleted.message;
                const timeStr  = getTime(deleted.messageTimestamp);
                const sender   = deleted.key.participant || deleted.key.remoteJid;
                const senderJidPart = sender.split('@')[0];

                const displayName = getDisplayName(deleted, sender);
                const { text }    = getMessageContent(msgObj);

                let formatted = `*ⓘ DELETED!*\n`;

                if (isGroup) {
                    let groupName = chat;
                    try {
                        const metadata = await sock.groupMetadata(chat);
                        groupName = metadata.subject || 'Unknown Group';
                    } catch {
                        groupName = 'Unknown Group';
                    }
                    formatted += `_❏◦Group_ •⌲ ${groupName}\n`;
                    formatted += `_𓋎◦sender_ •⌲ @${senderJidPart} (${displayName})\n`;
                } else {
                    formatted += `_❏◦Chat_ •⌲ ${displayName}\n`;
                    formatted += `_𓋎◦sender_ •⌲ @${senderJidPart}\n`;
                }

                formatted += `╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ᕗ\n`;
                formatted += `_*⎙ message:*_\n`;
                formatted += `☇\n`;
                formatted += `${text}\n\n\n`;
                formatted += `✐ ${timeStr}`;

                const sendOptions = { text: formatted, mentions: [sender] };

                // Determine destination based on mode
                const mode = db._mode || 'dm';
                const dest = mode === 'chat' ? chat : owner;

                await sock.sendMessage(dest, sendOptions).catch(() => {});

                console.log(`[ANTIDELETE] Forwarded from ${displayName} (${senderJidPart}) in ${isGroup ? 'group' : 'private'} → ${mode}`);
            }
        }
    } catch (e) {
        console.error('[ANTIDELETE ERROR]', e);
    }
};
                  
