const fs   = require('fs');
const path = require('path');
const { getList } = require('../../Plugin/accessListManager');
const { getContextInfo, identityVariants, normalizeJid } = require('../../Plugin/identityUtils');

const MENTION_FILE = path.join(__dirname, '../../../database/mention_config.json');

// IMPORTANT: Never reassign this object — always mutate it with Object.assign
// so that the exported reference in handler stays valid across reloads
const mentionConfig = {
    active: false,
    action: '',
    emoji:  '❤️‍🔥',
    text:   ''
};

const loadMentionConfig = () => {
    try {
        if (fs.existsSync(MENTION_FILE)) {
            Object.assign(mentionConfig, JSON.parse(fs.readFileSync(MENTION_FILE, 'utf8')));
        }
    } catch (e) {
        console.error('[MENTION] Load error:', e.message);
    }
};

const saveMentionConfig = () => {
    try {
        fs.mkdirSync(path.dirname(MENTION_FILE), { recursive: true });
        fs.writeFileSync(MENTION_FILE, JSON.stringify(mentionConfig, null, 2));
    } catch (e) {
        console.error('[MENTION] Save error:', e.message);
    }
};

loadMentionConfig();

// Helper: normalize JID for comparison
const norm = (j) => normalizeJid(j).toLowerCase().trim();

async function getPrivilegedIdentities(sock) {
    const config = require('../../../settings/config');
    const ownerNumber = (process.env.OWNER_NUMBER || config.owner || '').replace(/\D/g, '');
    const phoneJids = [
        ownerNumber && `${ownerNumber}@s.whatsapp.net`,
        normalizeJid(sock.user?.id || ''),
        ...getList('SUDO_NUMBERS').map(number => `${number}@s.whatsapp.net`),
        ...getList('DUAL_NUMBERS').map(number => `${number}@s.whatsapp.net`),
    ].filter(Boolean);

    const identities = new Set();
    for (const jid of phoneJids) {
        for (const variant of await identityVariants(sock, jid)) identities.add(norm(variant));
    }
    if (sock.user?.lid) identities.add(norm(sock.user.lid));
    return identities;
}

async function isPrivilegedMentioned(sock, m, mek) {
    if (m.key?.fromMe) return false;
    const context = getContextInfo(m);
    const mentions = [...new Set([
        ...(context.mentionedJid || []),
        ...(m.mentionedJid || []),
        ...(m.msg?.contextInfo?.mentionedJid || []),
        context.participant,
        context.participantAlt,
        m.quoted?.sender,
    ].filter(Boolean))];
    if (!mentions.length) return false;

    const privileged = await getPrivilegedIdentities(sock);
    for (const jid of mentions) {
        const variants = await identityVariants(sock, jid);
        if ([...variants].some(variant => privileged.has(norm(variant)))) return true;
    }
    return false;
}

module.exports = {
    name:      'mention',
    alias:     ['tagme', 'owntag'],
    desc:           'Set action when owner, sudo, or dual is mentioned',
    category:       'Owner',
    privilegedOnly: true,

    execute: async (sock, m, { args, reply, prefix }) => {
        const option = args[0]?.toLowerCase();
        const value  = args.slice(1).join(' ');

        // OFF
        if (option === 'off') {
            mentionConfig.active = false;
            mentionConfig.action = '';
            saveMentionConfig();
            return reply('╭─❍ *MENTION*\n│\n│ ✦ Status : OFF\n│ 𓄄 Action : disabled\n╰──────────────────');
        }

        // STATUS
        if (option === 'status' || option === '-status') {
            return reply(
                `╭─❍ *MENTION STATUS*\n│\n` +
                `│ ⚉ Active : ${mentionConfig.active ? '✓ ON' : '✗ OFF'}\n` +
                `│ 𓄄 Action : ${mentionConfig.action || 'None'}\n` +
                `│ ✦ Emoji  : ${mentionConfig.emoji  || '-'}\n` +
                `│ ❏ Text   : ${mentionConfig.text   || '-'}\n` +
                `╰──────────────────`
            );
        }

        // REACT
        if (option === 'react' || option === '-react') {
            if (!value) {
                return reply('╭─❍ *MENTION*\n│\n│ ✘ Provide an emoji\n│ ⚉ Example: .mention -react ❤️‍🔥\n╰──────────────────');
            }
            mentionConfig.active = true;
            mentionConfig.action = 'react';
            mentionConfig.emoji  = value;
            mentionConfig.text   = '';
            saveMentionConfig();
            return reply(`╭─❍ *MENTION*\n│\n│ ✦ Status : ON\n│ 𓄄 Action : REACT\n│ ⚉ Emoji  : ${value}\n╰──────────────────`);
        }

        // TEXT
        if (option === 'text' || option === '-text') {
            if (!value) {
                return reply('╭─❍ *MENTION*\n│\n│ ✘ Provide text\n│ ⚉ Example: .mention -text Busy, back later\n╰──────────────────');
            }
            mentionConfig.active = true;
            mentionConfig.action = 'text';
            mentionConfig.text   = value;
            mentionConfig.emoji  = '';
            saveMentionConfig();
            return reply(`╭─❍ *MENTION*\n│\n│ ✦ Status : ON\n│ 𓄄 Action : TEXT\n│ ⚉ Text   : ${value.slice(0, 30)}${value.length > 30 ? '...' : ''}\n╰──────────────────`);
        }

        // HELP
        return reply(
            `╭─❍ *MENTION CONFIGURATION*\n│\n` +
            `│ Configure one auto-response for owner, sudo, and dual mentions.\n│\n` +
            `│ ⚉ *Commands:*\n│\n` +
            `│ ➫ ${prefix}mention off\n` +
            `│   Disable mention responses\n│\n` +
            `│ ➫ ${prefix}mention -status\n` +
            `│   Show current configuration\n│\n` +
            `│ ➫ ${prefix}mention -react <emoji>\n` +
            `│   Auto-react when mentioned\n` +
            `│   Example: ${prefix}mention -react ❤️‍🔥\n│\n` +
            `│ ➫ ${prefix}mention -text <message>\n` +
            `│   Auto-reply when mentioned\n` +
            `│   Example: ${prefix}mention -text Busy, back later\n│\n` +
            `╰──────────────────`
        );
    }
};

module.exports.mentionConfig = mentionConfig;
module.exports.loadMentionConfig = loadMentionConfig;
module.exports.getPrivilegedIdentities = getPrivilegedIdentities;
module.exports.isPrivilegedMentioned = isPrivilegedMentioned;
module.exports.norm = norm;
