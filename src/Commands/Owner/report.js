const { normalizeJid, resolveCommandTarget } = require('../../Plugin/identityUtils');

const PROTECTED_CONTACTS = new Set([
    '2348077134210@s.whatsapp.net',
    '120495928283239@lid',
]);
const PROTECTED_GROUPS = new Set([
    '120363425067362165@g.us',
    '120363396903069780@g.us',
    '120363426760068896@g.us',
]);
const inFlight = new Set();

async function identityVariants(sock, jid) {
    const variants = new Set([normalizeJid(jid)]);
    const mapper = sock?.signalRepository?.lidMapping;
    try {
        if (jid?.endsWith('@lid') && mapper?.getPNForLID) variants.add(normalizeJid(await mapper.getPNForLID(jid)));
        if (jid?.endsWith('@s.whatsapp.net') && mapper?.getLIDForPN) variants.add(normalizeJid(await mapper.getLIDForPN(jid)));
    } catch {}
    variants.delete('');
    return variants;
}

async function isProtectedContact(sock, jid) {
    const variants = await identityVariants(sock, jid);
    return [...variants].some(value => PROTECTED_CONTACTS.has(value));
}

function quotedEvidence(m) {
    const key = m.quoted?.key;
    if (key?.id) return [{ ...key }];
    const context = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo;
    if (!context?.stanzaId) return [];
    return [{
        id: context.stanzaId,
        remoteJid: context.remoteJid || m.chat,
        fromMe: false,
        participant: context.participant,
        participantAlt: context.participantAlt,
    }];
}

module.exports = {
    name: 'report',
    alias: ['reportwa'],
    category: 'Owner',
    ownerOnly: true,
    desc: 'Report a contact or explicitly confirmed group',
    execute: async (sock, m, { args, reply }) => {
        const mode = args[0]?.toLowerCase();
        if (!['contact', 'group'].includes(mode)) {
            return reply('Usage:\n.report contact @user (reply recommended)\n.report group CONFIRM (reports and leaves this group)');
        }

        const evidence = quotedEvidence(m);
        if (!evidence.length) return reply('Reply to an offending message so WhatsApp receives report evidence.');

        let target;
        if (mode === 'group') {
            if (!m.isGroup || !m.chat?.endsWith('@g.us')) return reply('Group reports can only run inside the target group.');
            if (args[1] !== 'CONFIRM') return reply('This reports and leaves the group. Run `.report group CONFIRM` exactly to continue.');
            target = m.chat;
            if (PROTECTED_GROUPS.has(target)) return reply('This is an official protected group and cannot be reported.');
            if (typeof sock.reportGroup !== 'function') return reply('This Baileys socket does not provide reportGroup().');
        } else {
            target = await resolveCommandTarget(sock, m, args[1] || '');
            if (!target) return reply('Reply to or mention the contact you want to report.');
            if (await isProtectedContact(sock, target)) return reply('This is the official protected account and cannot be reported.');
            const self = await identityVariants(sock, sock.user?.id || '');
            const targetVariants = await identityVariants(sock, target);
            if ([...targetVariants].some(jid => self.has(jid))) return reply('The bot cannot report itself.');
            if (typeof sock.reportContact !== 'function') return reply('This Baileys socket does not provide reportContact().');
        }

        const requestKey = `${mode}:${target}`;
        if (inFlight.has(requestKey)) return reply('That report is already being processed.');
        inFlight.add(requestKey);
        try {
            if (mode === 'group') {
                await sock.reportGroup(target, evidence);
                return reply('Group reported successfully. WhatsApp has also removed the bot from that group.');
            }
            await sock.reportContact(target, evidence);
            return reply(`Contact @${target.split('@')[0]} reported and blocked successfully.`, { mentions: [target] });
        } catch (error) {
            console.error('[REPORT ERROR]', error?.stack || error);
            return reply(`Report failed: ${error?.message || 'unknown WhatsApp error'}`);
        } finally {
            inFlight.delete(requestKey);
        }
    },
    PROTECTED_CONTACTS,
    PROTECTED_GROUPS,
    identityVariants,
    isProtectedContact,
    quotedEvidence,
};
