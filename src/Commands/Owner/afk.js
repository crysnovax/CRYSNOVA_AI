const fs = require('fs');
const path = require('path');

const AFK_FILE = path.join(process.cwd(), 'database', 'afk.json');
const MARKER = '\u200E';

let afkData = {};

// ── Normalize JID to phone format consistently ──────────────────────────────
const normalizeJid = (jid) => (jid || '').replace(/:\d+@/, '@').toLowerCase().trim();

// ── Build storage key — always use normalized JID ───────────────────────────
const makeKey = (userId, chatId) => `${normalizeJid(userId)}_${chatId}`;

const loadAfk = () => {
    try {
        if (fs.existsSync(AFK_FILE)) {
            afkData = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[AFK LOAD]', e.message);
        afkData = {};
    }
};

const saveAfk = () => {
    try {
        fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
    } catch (e) {
        console.error('[AFK SAVE]', e.message);
    }
};

loadAfk();

module.exports = {
    name: 'afk',
    alias: ['away'],
    desc: 'Set AFK with optional reason',
    category: 'Owner',
    usage: '.afk [reason] | .afk off',

    execute: async (sock, m, { args, reply }) => {
        // Always store as phone JID — same source the owner mention handler uses
        const userId = (sock.user?.id || m.sender || '').replace(/:\d+@/, '@s.whatsapp.net');
        const chatId = m.chat;
        const key    = makeKey(userId, chatId);
        const sub    = args[0]?.toLowerCase();

        // Turn off
        if (sub === 'off') {
            const wasActive = afkData[key] && afkData[key].enabled;
            if (wasActive) delete afkData[key];
            saveAfk();
            return reply(wasActive ? '`⎙ AFK OFF`' + MARKER : '`✘ You were not AFK`' + MARKER);
        }

        // Turn on with reason
        const reason = args.join(' ') || 'AFK';
        afkData[key] = {
            enabled: true,
            reason: reason,
            timestamp: Date.now(),
            mentions: 0
        };
        saveAfk();

        return reply(`\`⎙ AFK ACTIVE\`\nReason: ${reason}\n_Send any message to turn off._` + MARKER);
    }
};

// ── Public helper functions ──────────────────────────────────────────────────

module.exports.getAfk = (userId, chatId) => {
    const record = afkData[makeKey(userId, chatId)];
    return (record && record.enabled === true) ? record : null;
};

module.exports.disableAfk = (userId, chatId) => {
    const key = makeKey(userId, chatId);
    if (afkData[key]) {
        delete afkData[key];
        saveAfk();
        return true;
    }
    return false;
};

module.exports.incrementMention = (userId, chatId) => {
    const key = makeKey(userId, chatId);
    if (afkData[key] && afkData[key].enabled) {
        afkData[key].mentions = (afkData[key].mentions || 0) + 1;
        saveAfk();
    }
};

module.exports.getAllAfkUsers = (chatId) => {
    const users = [];
    for (const key in afkData) {
        if (key.endsWith(`_${chatId}`) && afkData[key]?.enabled === true) {
            // Use lastIndexOf to safely handle underscores inside chatId
            const userId = key.slice(0, key.lastIndexOf(`_${chatId}`));
            users.push(userId);
        }
    }
    return users;
};

// ── AFK Mention Detection ────────────────────────────────────────────────────
// Exact copy of OWNER MENTION HANDLER adapted per AFK user.
// Uses ownerJid (stored phone JID) + botPnJid + botLid — same three forms.
module.exports.isAfkUserMentioned = (m, mek, sock) => {
    const rawMsg  = mek?.message || {};
    const ctxInfo = rawMsg.extendedTextMessage?.contextInfo ||
                    rawMsg.imageMessage?.contextInfo         ||
                    rawMsg.videoMessage?.contextInfo         ||
                    rawMsg.documentMessage?.contextInfo      || {};

    const norm = (j) => (j || '').replace(/:\d+@/, '@').toLowerCase().trim();

    // ── 1. COLLECT ALL MENTIONS ── (exact same as owner mention handler)
    const allMentions = [
        ...(ctxInfo.mentionedJid             || []),
        ...(m.mentionedJid                   || []),
        ...(m.msg?.contextInfo?.mentionedJid || []),
    ];
    const uniqueMentions = [...new Set(allMentions)].filter(Boolean);

    // ── 2. BUILD TEXT CONTENT ── (exact same as owner mention handler)
    const allText = [
        rawMsg.conversation,
        rawMsg.extendedTextMessage?.text,
        rawMsg.imageMessage?.caption,
        rawMsg.videoMessage?.caption,
        m.text,
        m.body
    ].filter(Boolean).join(' ');

    // ── 3. Bot JID forms — mirrors ownerJid / botPnJid / botLid ──
    const botPnJid = (sock.user?.id  || '').replace(/:\d+@/, '@s.whatsapp.net');
    const botLid   =  sock.user?.lid || '';

    // ── 4. CHECK EACH AFK USER ──
    const afkUsers = module.exports.getAllAfkUsers(m.chat);

    for (const afkUser of afkUsers) {
        // afkUser is stored as phone JID (e.g. 2348012345678@s.whatsapp.net)
        const afkNumber = afkUser.split('@')[0].replace(/[^0-9]/g, '');
        let isMentioned = false;

        // ── CHECK MENTION JIDs — exact owner mention handler loop ──
        for (const jid of uniqueMentions) {
            const normalized = norm(jid);

            // Phone JID match (ownerJid equivalent) or bot PN JID match
            if (normalized === norm(afkUser) || normalized === norm(botPnJid)) {
                isMentioned = true; break;
            }

            // LID match (botLid equivalent)
            if (botLid && normalized === norm(botLid)) {
                isMentioned = true; break;
            }

            // decodeJid — resolve LID mention to phone JID
            try {
                const decoded = sock.decodeJid(jid);
                if (decoded && norm(decoded) === norm(afkUser)) { isMentioned = true; break; }
            } catch {}

            // participantAlt — alternate JID field
            const participantAlt = ctxInfo.participantAlt || m.msg?.contextInfo?.participantAlt;
            if (participantAlt && norm(participantAlt) === norm(afkUser)) { isMentioned = true; break; }
        }

        // ── CHECK QUOTED PARTICIPANT (LID-aware) ──
        // WhatsApp sends quoted sender as @lid in newer privacy model.
        // Resolve using decodeJid + participantAlt — same as mention loop.
        if (!isMentioned) {
            const quotedParticipant = ctxInfo.participant || '';
            if (quotedParticipant) {
                const qNorm = norm(quotedParticipant);
                if (
                    qNorm === norm(afkUser)  ||
                    qNorm === norm(botPnJid) ||
                    (botLid && qNorm === norm(botLid))
                ) {
                    isMentioned = true;
                } else {
                    try {
                        const decoded = sock.decodeJid(quotedParticipant);
                        if (decoded && norm(decoded) === norm(afkUser)) isMentioned = true;
                    } catch {}
                    if (!isMentioned) {
                        const participantAlt = ctxInfo.participantAlt || m.msg?.contextInfo?.participantAlt;
                        if (participantAlt && norm(participantAlt) === norm(afkUser)) isMentioned = true;
                    }
                }
            }
        }

        // ── CHECK TEXT CONTENT ── (exact same as owner mention handler)
        if (!isMentioned) {
            const waLink1 = `wa.me/${afkNumber}`;
            const waLink2 = `https://wa.me/${afkNumber}`;
            const waLink3 = `https://api.whatsapp.com/send?phone=${afkNumber}`;
            isMentioned =
                allText.includes(afkNumber)       ||
                allText.includes(`@${afkNumber}`) ||
                allText.includes(afkUser)          ||
                allText.includes(waLink1)          ||
                allText.includes(waLink2)          ||
                allText.includes(waLink3);
        }

        if (isMentioned) return afkUser;
    }

    return null;
};

module.exports.loadAfk = loadAfk;
module.exports.saveAfk = saveAfk;
module.exports.MARKER  = MARKER;
