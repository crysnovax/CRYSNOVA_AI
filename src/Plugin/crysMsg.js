// crysMsg.js
const { getCommand } = require('./crysCmd');
const { getVar }     = require('./configManager');
const chalk = require('chalk');
const fs    = require('fs');
const path  = require('path');

const ENV_PATH  = path.join(process.cwd(), '.env');
const cooldowns = new Map();

const normalizeJid = (jid = '') => jid.replace(/:\d+@/, '@');

// Map-safe contact lookup
const extractPhoneNumber = (jid, store = null) => {
    if (!jid) return null;

    if (jid.endsWith('@s.whatsapp.net')) {
        return jid.split('@')[0].replace(/[^0-9]/g, '');
    }

    if (jid.endsWith('@lid') && store?.contacts) {
        const contacts = store.contacts;

        const getContact = (key) =>
            contacts instanceof Map ? contacts.get(key) : contacts[key];

        const contact = getContact(jid);
        if (contact?.phoneNumber) {
            return contact.phoneNumber.replace(/[^0-9]/g, '');
        }

        const allContacts = contacts instanceof Map
            ? [...contacts.values()]
            : Object.values(contacts);

        const found = allContacts.find(c => c.lid === jid || c.id === jid);
        if (found?.phoneNumber) {
            return found.phoneNumber.replace(/[^0-9]/g, '');
        }
    }

    return jid.split('@')[0].replace(/[^0-9]/g, '');
};

const getAltJid = (m) => {
    if (m.key?.remoteJidAlt)   return m.key.remoteJidAlt;
    if (m.key?.participantAlt) return m.key.participantAlt;

    if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        const ctx = m.message.extendedTextMessage.contextInfo;
        if (ctx.participant !== m.key.participant) return ctx.participant;
    }

    return null;
};

const getSudoList = () => {
    try {
        let fromFile = '';
        if (fs.existsSync(ENV_PATH)) {
            const data  = fs.readFileSync(ENV_PATH, 'utf8');
            const match = data.match(/SUDO_NUMBERS=(.*)/);
            if (match) fromFile = match[1];
        }
        const fromRuntime = String(getVar('SUDO_NUMBERS') || '');

        const list = [fromFile, fromRuntime]
            .filter(Boolean)
            .join(',')
            .split(',')
            .map(n => n.replace(/[^0-9]/g, '').trim())
            .filter(Boolean);

        return [...new Set(list)];
    } catch (e) {
        console.error('[SUDO] Read error:', e.message);
        return [];
    }
};

const isSudoUser = (sender, store = null) => {
    if (!sender) return false;
    const sudoList = getSudoList();
    if (!sudoList.length) return false;

    const identifiers = new Set();
    const primaryNum  = extractPhoneNumber(sender, store);
    if (primaryNum) identifiers.add(primaryNum);

    return sudoList.some(sudoNum => {
        if (identifiers.has(sudoNum)) return true;
        for (const id of identifiers) {
            if (id.endsWith(sudoNum) || sudoNum.endsWith(id) ||
                id.includes(sudoNum) || sudoNum.includes(id)) return true;
        }
        return false;
    });
};

const lidToPhoneMap = new Map();

const handleMessage = async (sock, m, store) => {
    try {
        if (!m || !m.message) return;
        if (m.key?.remoteJid === 'status@broadcast') return;

        const prefix    = getVar('PREFIX', '.');
        const autoReact = getVar('AUTO_REACT', true);
        const cooldown  = getVar('COOLDOWN', 3);

        const config = () => require('../../settings/config');
        const cfg    = config();

        let sender    = m.sender || m.key?.participant || m.key?.remoteJid;
        let senderNum = extractPhoneNumber(sender, store);

        const altJid = getAltJid(m);
        let   altNum = null;
        if (altJid) {
            altNum = extractPhoneNumber(altJid, store);
            if (sender.endsWith('@lid') && altJid.endsWith('@s.whatsapp.net')) {
                lidToPhoneMap.set(sender, altJid);
                lidToPhoneMap.set(sender.split('@')[0], altJid.split('@')[0]);
            }
        }

        const ownerRaw = process.env.OWNER_NUMBER || getVar('OWNER_NUMBER', cfg.owner) || cfg.owner || '';
        const ownerNum = normalizeJid(ownerRaw).split('@')[0].replace(/[^0-9]/g, '');

        const isOwner = !!ownerNum && (
            senderNum === ownerNum ||
            altNum    === ownerNum ||
            senderNum.endsWith(ownerNum) ||
            ownerNum.endsWith(senderNum)
        );

        const isSudo = isOwner || isSudoUser(sender, store) ||
                       (altNum && isSudoUser(altJid, store));

        const body = m.text || '';
        if (!body.startsWith(prefix)) return;

        const cmdName = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
        const args    = body.trim().split(/ +/).slice(1);
        const text    = args.join(' ');

        const cmd = getCommand(cmdName);
        if (!cmd) return;

        let groupMeta, isAdmin, isBotAdmin;
        if (m.isGroup) {
            groupMeta = await sock.groupMetadata(m.chat).catch(() => null);
            const admins = (groupMeta?.participants || [])
                .filter(p => p.admin)
                .map(p => normalizeJid(p.id));

            const senderJid = normalizeJid(m.sender);
            const botJid    = normalizeJid(sock.user?.id || '');

            isAdmin    = admins.includes(senderJid);
            isBotAdmin = admins.includes(senderJid); // FIX: was senderJid — wrong
        }

        const reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

        // MODIFIED: Allow 'appeal' command for everyone even in private mode
        const isPublicCommand = cmdName === 'appeal';
        
        if (!cfg.status.public && !isSudo && !isPublicCommand) {
            if (autoReact) {
                await sock.sendMessage(m.chat, { react: { text: '⚉', key: m.key } }).catch(() => {});
            }
            return;
        }

        if (cmd.ownerOnly   && !isOwner)             return reply(cfg.message.owner   || 'Owner only!');
        if (cmd.sudoOnly    && !isSudo)              return reply(cfg.message.owner   || 'Sudo only!');
        if (cmd.groupOnly   && !m.isGroup)           return reply(cfg.message.group   || 'Group only!');
        if (cmd.privateOnly && m.isGroup)            return reply(cfg.message.private || 'Private only!');
        if (cmd.adminOnly   && !isAdmin && !isSudo)  return reply(cfg.message.admin   || 'Admin only!');
        if (cmd.botAdmin    && !isBotAdmin)          return reply('𓉤 Make me an admin first!');

        // MODIFIED: Skip cooldown for public commands like appeal
        if (!isSudo && cooldown > 0 && !isPublicCommand) {
            const cdKey = `${m.sender}:${cmdName}`;
            const now   = Date.now();
            const exp   = cooldowns.get(cdKey);
            if (exp && now < exp) return reply(`🚀 Wait ${((exp - now) / 1000).toFixed(1)}s`);
            cooldowns.set(cdKey, now + cooldown * 1000);
        }

        if (autoReact) {
            await sock.sendMessage(m.chat, { react: { text: cmd.reactions?.start || '✨', key: m.key } }).catch(() => {});
        }

        console.log(chalk.cyan(`[CMD] ${prefix}${cmdName} | ${senderNum}${isOwner ? ' [OWNER]' : isSudo ? ' [SUDO]' : ''}`));

        await cmd.execute(sock, m, {
            args, text, prefix, isOwner, isSudo, isAdmin, isBotAdmin,
            isGroup: m.isGroup, groupMeta, reply, config: cfg, store, getVar
        });

        if (global.crysStats) global.crysStats.commands++;

        if (autoReact) {
            await sock.sendMessage(m.chat, { react: { text: cmd.reactions?.success || '🥏', key: m.key } }).catch(() => {});
        }

    } catch (err) {
        console.log(chalk.red('[MSG ERROR]'), err.message);
        sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } }).catch(() => {});
    }
};

module.exports = { handleMessage };
            
