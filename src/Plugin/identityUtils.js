const normalizeJid = (jid = '') => String(jid).replace(/:\d+@/, '@');
const cleanNumber = (value = '') => String(value).replace(/[^0-9]/g, '');
const isPhoneJid = (jid = '') => normalizeJid(jid).endsWith('@s.whatsapp.net');

async function resolvePhoneJid(sock, candidates = []) {
    const values = [...new Set(candidates.filter(Boolean).map(normalizeJid))];
    const direct = values.find(isPhoneJid);
    if (direct) return direct;

    const mapper = sock?.signalRepository?.lidMapping;
    if (mapper?.getPNForLID) {
        for (const jid of values.filter(value => value.endsWith('@lid'))) {
            try {
                const mapped = await mapper.getPNForLID(jid);
                if (mapped) return normalizeJid(mapped);
            } catch {}
        }
    }

    return null;
}

function getContextInfo(m) {
    return m?.msg?.contextInfo
        || m?.message?.extendedTextMessage?.contextInfo
        || m?.message?.imageMessage?.contextInfo
        || m?.message?.videoMessage?.contextInfo
        || {};
}

async function resolveCommandTarget(sock, m, rawValue = '') {
    const contextInfo = getContextInfo(m);
    const explicitNumber = cleanNumber(rawValue);
    if (explicitNumber) return `${explicitNumber}@s.whatsapp.net`;

    const candidates = [
        ...(m?.mentionedJid || []),
        ...(contextInfo.mentionedJid || []),
        m?.quoted?.sender,
        m?.quoted?.key?.participant,
        contextInfo.participantAlt,
        contextInfo.participant,
    ];

    return resolvePhoneJid(sock, candidates);
}

module.exports = {
    cleanNumber,
    getContextInfo,
    isPhoneJid,
    normalizeJid,
    resolveCommandTarget,
    resolvePhoneJid,
};
