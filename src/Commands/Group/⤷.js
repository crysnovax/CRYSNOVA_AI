const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateMessageIDV2, buildLinkPreview } = require('@crysnovax/baileys');

// ── Status ID Store ───────────────────────────────────────────
const DB_PATH = path.join(__dirname, '../../../database/gstatus-ids.json');

function loadIds() {
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {}
    return {};
}

function saveId(jid, msgId) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        const db = loadIds();
        if (!db[jid]) db[jid] = [];
        db[jid].push(msgId);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('[GSTATUS DB ERROR]', err.message);
    }
}

function clearIds(jid) {
    try {
        const db = loadIds();
        const ids = db[jid] || [];
        delete db[jid];
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return ids;
    } catch {}
    return [];
}

// ── Helper: send + track ──────────────────────────────────────
async function relayAndTrack(sock, jid, message) {
    const msgId = generateMessageIDV2(sock.user.id);
    await sock.relayMessage(jid, message, { messageId: msgId });
    saveId(jid, msgId);
    return msgId;
}

// ── URL Detection ─────────────────────────────────────────────
function extractFirstUrl(text) {
    if (!text) return null;
    const match = text.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[0] : null;
}

// ── Build preview object ──────────────────────────────────────
async function buildPreview(url, sock, customTitle, customDesc) {
    const result = await buildLinkPreview(url, sock, { customTitle, customDesc });
    if (!result.imageBuffer) return { url, title: result.title, description: result.description };

    let hq = null;
    let smallThumb = null;
    try {
        const prepared = await prepareWAMessageMedia(
            { image: result.imageBuffer },
            { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
        );
        hq = prepared.imageMessage;
        smallThumb = hq?.jpegThumbnail ? Buffer.from(hq.jpegThumbnail) : null;
    } catch (err) {
        console.error('[HQ THUMB ERROR]', err.message);
    }

    return { url, title: result.title, description: result.description, smallThumb, hq };
}

// ── Build groupStatusMessageV2 with link preview ──────────────
function buildGroupStatusTextMessage(text, preview) {
    const extMsg = { text };
    if (preview) {
        extMsg.matchedText = preview.url;
        extMsg.canonicalUrl = preview.url;
        extMsg.title = preview.title || '';
        extMsg.description = preview.description || '';
        extMsg.previewType = 5;
        if (preview.smallThumb) extMsg.jpegThumbnail = preview.smallThumb;
        if (preview.hq) {
            extMsg.thumbnailDirectPath = preview.hq.directPath;
            extMsg.mediaKey = preview.hq.mediaKey;
            extMsg.mediaKeyTimestamp = preview.hq.mediaKeyTimestamp;
            extMsg.thumbnailWidth = preview.hq.width;
            extMsg.thumbnailHeight = preview.hq.height;
            extMsg.thumbnailSha256 = preview.hq.fileSha256;
            extMsg.thumbnailEncSha256 = preview.hq.fileEncSha256;
        }
    }
    return { groupStatusMessageV2: { message: { extendedTextMessage: extMsg } } };
}

module.exports = {
    name: 'gstatus',
    alias: ['groupstatus', 'gs'],
    desc: 'Post a status to the group',
    category: 'Admin',
    groupOnly: true,
    adminOnly: true,

    execute: async (sock, m, { text, reply }) => {
        try {
            const quoted = m.quoted || {};
            const chat = m.chat;

            await sock.sendMessage(chat, {
                react: { text: '📸', key: m.key }
            });

            // ── GS CLEAR — delete all tracked statuses ────
            if (text && text.trim().toLowerCase() === 'clear') {
                const ids = clearIds(chat);
                if (!ids.length) return reply('`—͟͟͞͞𖣘 No tracked statuses to delete`');

                let deleted = 0, failed = 0;
                for (const msgId of ids) {
                    try {
                        await sock.deleteGroupStatus(chat, {
                            remoteJid: chat,
                            fromMe: true,
                            id: msgId
                        });
                        deleted++;
                    } catch { failed++; }
                    await new Promise(r => setTimeout(r, 300));
                }
                return reply(`\`—͟͟͞͞𖣘 Cleared ${deleted} status(es)${failed ? `, ${failed} failed` : ''}\``);
            }

            // ─────────────────────────────
            // FEATURE: BROADCAST TO ALL GROUPS
            // !gstatus text | all
            // !gstatus | all (reply)
            // ─────────────────────────────
            if (text && text.includes('|')) {
                const [left, right] = text.split('|').map(v => v.trim());

                if (right && right.toLowerCase() === 'all') {
                    const messageText = left || quoted.text || quoted.caption || '';

                    if (!messageText) {
                        return reply('`✘ Please provide a message to broadcast`');
                    }

                    const groups = await sock.groupFetchAllParticipating();
                    const groupIds = Object.keys(groups);

                    if (!groupIds.length) {
                        return reply('`✘ Bot is not in any groups`');
                    }

                    await reply(`\`—͟͟͞͞𖣘 Broadcasting to ${groupIds.length} groups...\``);

                    let success = 0;
                    let failed = 0;
                    const url = extractFirstUrl(messageText);
                    let message;

                    if (url) {
                        const preview = await buildPreview(url, sock, '', '');
                        message = buildGroupStatusTextMessage(messageText, preview);
                    } else {
                        message = { groupStatusMessageV2: { message: { extendedTextMessage: { text: messageText } } } };
                    }

                    for (const groupId of groupIds) {
                        try {
                            await relayAndTrack(sock, groupId, message);
                            success++;
                        } catch (err) {
                            failed++;
                        }
                        await new Promise(res => setTimeout(res, 500));
                    }

                    return reply(
                        `\`—͟͟͞͞𖣘 Broadcast Done\`\n` +
                        `Success: ${success}\nFailed: ${failed}`
                    );
                }
            }

            // ─────────────────────────────
            // PARSE: text | jid
            // ─────────────────────────────
            let messageText = '';
            let targetJid = chat;

            if (text && text.includes('|')) {
                const [left, right] = text.split('|').map(v => v.trim());

                if (!left && right) {
                    targetJid = right;
                } else {
                    messageText = left || '';
                    if (right) targetJid = right;
                }
            } else {
                messageText = text || '';
            }

            if (!targetJid.endsWith('@g.us')) {
                return reply('`✘ Invalid group JID`');
            }

            if (targetJid !== chat) {
                try {
                    await sock.groupMetadata(targetJid);
                } catch {
                    return reply('`✘ Bot is not in that group`');
                }
            }

            const imageMsg   = quoted.mtype === 'imageMessage'    ? quoted : null;
            const videoMsg   = quoted.mtype === 'videoMessage'    ? quoted : null;
            const audioMsg   = quoted.mtype === 'audioMessage'    ? quoted : null;
            const docMsg     = quoted.mtype === 'documentMessage' ? quoted : null;
            const stickerMsg = quoted.mtype === 'stickerMessage'  ? quoted : null;

            // IMAGE
            if (imageMsg) {
                let media = await quoted.download();
                const finalCaption = messageText || quoted.caption || quoted.text || '';
                try {
                    media = await sharp(media)
                        .resize({ width: 1920, height: 1080, fit: 'inside' })
                        .jpeg({ quality: 100 })
                        .toBuffer();
                } catch {}
                const imgMsg = await sock.sendMessage(targetJid, {
                    image: media,
                    caption: finalCaption,
                    groupStatus: true
                });
                saveId(targetJid, imgMsg?.key?.id);
                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // VIDEO
            if (videoMsg) {
                const media = await quoted.download();
                const finalCaption = messageText || quoted.caption || quoted.text || '';
                const vidMsg = await sock.sendMessage(targetJid, {
                    video: media,
                    caption: finalCaption,
                    groupStatus: true
                });
                saveId(targetJid, vidMsg?.key?.id);
                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // AUDIO
            if (audioMsg) {
                const media = await quoted.download();
                const audMsg = await sock.sendMessage(targetJid, {
                    audio: media,
                    ptt: quoted.ptt || false,
                    mimetype: quoted.mimetype || 'audio/mpeg',
                    groupStatus: true
                });
                saveId(targetJid, audMsg?.key?.id);
                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // DOCUMENT
            if (docMsg) {
                const media = await quoted.download();
                const docMsgSent = await sock.sendMessage(targetJid, {
                    document: media,
                    mimetype: quoted.mimetype,
                    fileName: quoted.fileName || 'document',
                    caption: messageText,
                    groupStatus: true
                });
                saveId(targetJid, docMsgSent?.key?.id);
                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // STICKER
            if (stickerMsg) {
                let media = await quoted.download();
                try {
                    media = await sharp(media)
                        .resize({ width: 1920, height: 1080, fit: 'inside' })
                        .jpeg({ quality: 100 })
                        .toBuffer();
                } catch {}
                const stkMsg = await sock.sendMessage(targetJid, {
                    image: media,
                    caption: messageText,
                    groupStatus: true
                });
                saveId(targetJid, stkMsg?.key?.id);
                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // TEXT ONLY — with link preview support
            if (messageText || quoted.text || quoted.caption) {
                const finalText = messageText || quoted.text || quoted.caption || '';
                const url = extractFirstUrl(finalText);

                if (url) {
                    const preview = await buildPreview(url, sock, '', '');
                    const message = buildGroupStatusTextMessage(finalText, preview);
                    await relayAndTrack(sock, targetJid, message);
                } else {
                    const txtMsg = await sock.sendMessage(targetJid, {
                        text: finalText,
                        groupStatus: true
                    });
                    saveId(targetJid, txtMsg?.key?.id);
                }

                return reply('`—͟͟͞͞𖣘 Posted successfully`');
            }

            // HELP MENU
            return reply(
`─────────────────
  ✦  GROUP STATUS
─────────────────
▸ !gstatus <text>
▸ !gstatus <url>  ← with rich preview
▸ Reply to image + .gstatus [caption]
▸ Reply to video + .gstatus [caption]
▸ Reply to audio + .gstatus
▸ Reply to document + .gstatus [caption]
▸ !gstatus <text> | <groupJID>
▸ !gstatus <text> | all  ← broadcast
▸ !gstatus clear  ← delete all
─────────────────
EXAMPLES:
!gstatus hello world | 120363425204601114@g.us
!gstatus hello everyone | all
!gstatus clear
─────────────────`
            );

        } catch (err) {
            console.error('[GSTATUS ERROR]', err);
            reply(`\`✘ ${err.message || 'Unknown error'}\``);
        }
    }
};
