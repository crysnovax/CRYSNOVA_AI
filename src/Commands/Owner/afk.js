const fs = require('fs');
const path = require('path');
const {
    getContextInfo,
    identitiesOverlap,
    identityVariants,
    normalizeJid,
    resolvePhoneJid,
} = require('../../Plugin/identityUtils');

const AFK_FILE = path.join(process.cwd(), 'database', 'afk.json');
const MARKER = '\u200E';
let afkData = {};

const makeKey = (userId, chatId) => `${normalizeJid(userId)}_${chatId}`;

const loadAfk = () => {
    try {
        afkData = fs.existsSync(AFK_FILE)
            ? JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'))
            : {};
    } catch (error) {
        console.error('[AFK LOAD]', error.message);
        afkData = {};
    }
};

const saveAfk = () => {
    try {
        fs.mkdirSync(path.dirname(AFK_FILE), { recursive: true });
        fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
    } catch (error) {
        console.error('[AFK SAVE]', error.message);
    }
};

async function resolveSenderPhoneJid(sock, m) {
    const context = getContextInfo(m);
    return resolvePhoneJid(sock, [
        m.sender,
        m.key?.participantAlt,
        m.key?.participant,
        context.participantAlt,
    ]) || normalizeJid(m.sender || sock.user?.id || '');
}

loadAfk();

module.exports = {
    name: 'afk',
    alias: ['away'],
    desc: 'Set per-user AFK for owner, sudo, or dual',
    category: 'Owner',
    usage: '.afk [reason] | .afk off',
    privilegedOnly: true,

    execute: async (sock, m, { args, reply }) => {
        const userId = await resolveSenderPhoneJid(sock, m);
        if (!userId) return reply('Could not resolve your WhatsApp identity.');

        const key = makeKey(userId, m.chat);
        const sub = args[0]?.toLowerCase();
        if (sub === 'off') {
            const wasActive = Boolean(afkData[key]?.enabled);
            if (wasActive) delete afkData[key];
            saveAfk();
            return reply((wasActive ? '`⎙ AFK OFF`' : '`✘ You were not AFK`') + MARKER);
        }

        const reason = args.join(' ').trim() || 'AFK';
        afkData[key] = { enabled: true, reason, timestamp: Date.now(), mentions: 0 };
        saveAfk();
        return reply(`\`⎙ AFK ACTIVE\`\nReason: ${reason}\n_Send any message to turn off your AFK._` + MARKER);
    }
};

module.exports.getAfk = (userId, chatId) => {
    const record = afkData[makeKey(userId, chatId)];
    return record?.enabled === true ? record : null;
};

module.exports.disableAfk = (userId, chatId) => {
    const key = makeKey(userId, chatId);
    if (!afkData[key]) return false;
    delete afkData[key];
    saveAfk();
    return true;
};

module.exports.incrementMention = (userId, chatId) => {
    const key = makeKey(userId, chatId);
    if (afkData[key]?.enabled) {
        afkData[key].mentions = (afkData[key].mentions || 0) + 1;
        saveAfk();
    }
};

module.exports.getAllAfkUsers = (chatId) => Object.keys(afkData)
    .filter(key => key.endsWith(`_${chatId}`) && afkData[key]?.enabled)
    .map(key => key.slice(0, key.lastIndexOf(`_${chatId}`)));

module.exports.isAfkUserMentioned = async (m, mek, sock) => {
    const rawMsg = mek?.message || m.message || {};
    const context = getContextInfo(m);
    const mentions = [...new Set([
        ...(context.mentionedJid || []),
        ...(m.mentionedJid || []),
        ...(m.msg?.contextInfo?.mentionedJid || []),
        context.participant,
        context.participantAlt,
        m.quoted?.sender,
    ].filter(Boolean))];
    const text = [
        rawMsg.conversation,
        rawMsg.extendedTextMessage?.text,
        rawMsg.imageMessage?.caption,
        rawMsg.videoMessage?.caption,
        m.text,
        m.body,
    ].filter(Boolean).join(' ');

    for (const afkUser of module.exports.getAllAfkUsers(m.chat)) {
        const variants = await identityVariants(sock, afkUser);
        let matched = false;
        for (const mention of mentions) {
            const mentionVariants = await identityVariants(sock, mention);
            if ([...mentionVariants].some(jid => variants.has(jid))) {
                matched = true;
                break;
            }
        }

        if (!matched) {
            const number = afkUser.split('@')[0].replace(/\D/g, '');
            matched = Boolean(number) && [
                number,
                `@${number}`,
                `wa.me/${number}`,
                `https://wa.me/${number}`,
                `https://api.whatsapp.com/send?phone=${number}`,
            ].some(value => text.includes(value));
        }
        if (matched) return afkUser;
    }
    return null;
};

module.exports.isSameIdentity = identitiesOverlap;
module.exports.resolveSenderPhoneJid = resolveSenderPhoneJid;
module.exports.loadAfk = loadAfk;
module.exports.saveAfk = saveAfk;
module.exports.MARKER = MARKER;
