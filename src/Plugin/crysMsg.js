// crysMsg.js - Updated with LID/Phone Number handling
const { getCommand } = require('./crysCmd');
const { getVar } = require('./configManager');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(process.cwd(), '.env');
const cooldowns = new Map();

const normalizeJid = (jid = '') => jid.replace(/:\d+@/, '@');

// Extract phone number from various JID formats
const extractPhoneNumber = (jid, store = null) => {
    if (!jid) return null;
    
    // If it's already @s.whatsapp.net, extract the number
    if (jid.endsWith('@s.whatsapp.net')) {
        return jid.split('@')[0].replace(/[^0-9]/g, '');
    }
    
    // If it's @lid, try to get phone from store.contacts
    if (jid.endsWith('@lid') && store?.contacts) {
        const contact = store.contacts[jid];
        if (contact?.phoneNumber) {
            return contact.phoneNumber.replace(/[^0-9]/g, '');
        }
        // Try to find by lid field
        const foundContact = Object.values(store.contacts).find(c => 
            c.lid === jid || c.id === jid
        );
        if (foundContact?.phoneNumber) {
            return foundContact.phoneNumber.replace(/[^0-9]/g, '');
        }
    }
    
    // Fallback: extract digits from any format
    return jid.split('@')[0].replace(/[^0-9]/g, '');
};

// Get alternative JID (LID <-> Phone mapping)
const getAltJid = (m) => {
    // Baileys v7+ provides these fields
    if (m.key?.remoteJidAlt) return m.key.remoteJidAlt;
    if (m.key?.participantAlt) return m.key.participantAlt;
    
    // Check message context
    if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        const ctx = m.message.extendedTextMessage.contextInfo;
        if (ctx.participant !== m.key.participant) {
            return ctx.participant;
        }
    }
    
    return null;
};

// Read sudo from .env and runtime
const getSudoList = () => {
    try {
        let fromFile = '';
        if (fs.existsSync(ENV_PATH)) {
            const data = fs.readFileSync(ENV_PATH, 'utf8');
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

// Flexible Sudo Check (handles LID and Phone number formats)
const isSudoUser = (sender, store = null) => {
    if (!sender) return false;

    const sudoList = getSudoList();
    if (!sudoList.length) return false;

    // Get all possible identifiers for this sender
    const identifiers = new Set();
    
    // Primary JID
    const primaryNum = extractPhoneNumber(sender, store);
    if (primaryNum) identifiers.add(primaryNum);
    
    // Alternative JID (if available in message)
    // Note: We need to pass m here, so we'll handle this in handleMessage
    
    // Debug logs
    //console.log('🔍 SENDER RAW:', sender);
   // console.log('🔍 EXTRACTED NUM:', primaryNum);
    //console.log('🔍 SUDO LIST:', sudoList);

    const result = sudoList.some(sudoNum => {
        // Exact match
        if (identifiers.has(sudoNum)) return true;
        
        // Check if any identifier ends with or contains sudo number
        for (const id of identifiers) {
            if (id.endsWith(sudoNum) || sudoNum.endsWith(id) ||
                id.includes(sudoNum) || sudoNum.includes(id)) {
                return true;
            }
        }
        return false;
    });

   // console.log('🔍 IS SUDO RESULT:', result);
    return result;
};

// Store LID mappings when received
const lidToPhoneMap = new Map();

const handleMessage = async (sock, m, store) => {
    try {
        if (!m || !m.message) return;
        if (m.key?.remoteJid === 'status@broadcast') return;

        const prefix     = getVar('PREFIX', '.');
        const autoReact  = getVar('AUTO_REACT', true);
        const cooldown   = getVar('COOLDOWN', 3);

        const config = () => require('../../settings/config');
        const cfg    = config();

        // Get sender with LID mapping resolution
        let sender = m.sender || m.key?.participant || m.key?.remoteJid;
        let senderNum = extractPhoneNumber(sender, store);
        
        // Check for alternative JID (phone number format)
        const altJid = getAltJid(m);
        let altNum = null;
        if (altJid) {
            altNum = extractPhoneNumber(altJid, store);
            // Store mapping for future use
            if (sender.endsWith('@lid') && altJid.endsWith('@s.whatsapp.net')) {
                lidToPhoneMap.set(sender, altJid);
                lidToPhoneMap.set(sender.split('@')[0], altJid.split('@')[0]);
            }
        }

        // Owner & Sudo
        const ownerRaw  = process.env.OWNER_NUMBER || getVar('OWNER_NUMBER', cfg.owner) || cfg.owner || '';
        let ownerNum    = normalizeJid(ownerRaw).split('@')[0].replace(/[^0-9]/g, '');

        // Check if sender matches owner (including LID mapping)
        const isOwner = !!ownerNum && (
            senderNum === ownerNum || 
            altNum === ownerNum ||
            senderNum.endsWith(ownerNum) || 
            ownerNum.endsWith(senderNum)
        );
        
        // Enhanced sudo check with alternative number
        const isSudo  = isOwner || isSudoUser(sender, store) || 
                       (altNum && isSudoUser(altJid, store));

      //  console.log('👑 OWNER:', ownerNum);
       // console.log('👤 CURRENT USER:', sender, '|', senderNum);
       // if (altNum) console.log('👤 ALT NUMBER:', altNum);
      //  console.log('✅ FINAL IS SUDO:', isSudo);

        const body = m.text || '';
        if (!body.startsWith(prefix)) return;

        const cmdName = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
        const args    = body.trim().split(/ +/).slice(1);
        const text    = args.join(' ');

        const cmd = getCommand(cmdName);
        if (!cmd) return;

        // Group metadata
        let groupMeta, isAdmin, isBotAdmin;
        if (m.isGroup) {
            groupMeta = await sock.groupMetadata(m.chat).catch(() => null);
            const admins = (groupMeta?.participants || [])
                .filter(p => p.admin)
                .map(p => normalizeJid(p.id));

            const senderJid = normalizeJid(m.sender);
            const botJid    = normalizeJid(sock.user?.id || '');

            isAdmin    = admins.includes(senderJid);
            isBotAdmin = admins.includes(botJid);
        }

        const reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

        // PUBLIC / PRIVATE GATE - Sudo bypass
        if (!cfg.status.public && !isSudo) {
            //console.log('🚫 BLOCKED BY PRIVATE MODE');
            if (autoReact) {
                await sock.sendMessage(m.chat, { react: { text: '⚉', key: m.key } }).catch(() => {});
            }
            return;
        }

        // Permission checks
        if (cmd.ownerOnly && !isOwner) return reply(cfg.message.owner || 'Owner only!');
        if (cmd.sudoOnly && !isSudo) return reply(cfg.message.owner || 'Sudo only!');
        if (cmd.groupOnly && !m.isGroup) return reply(cfg.message.group || 'Group only!');
        if (cmd.privateOnly && m.isGroup) return reply(cfg.message.private || 'Private only!');
        if (cmd.adminOnly && !isAdmin && !isSudo) return reply(cfg.message.admin || 'Admin only!');
        if (cmd.botAdmin && !isBotAdmin) return reply('𓉤 Make me an admin first!');

        // Cooldown (skip for sudo/owner)
        if (!isSudo && cooldown > 0) {
            const cdKey = `${m.sender}:${cmdName}`;
            const now = Date.now();
            const exp = cooldowns.get(cdKey);
            if (exp && now < exp) return reply(`🚀 Wait ${((exp - now) / 1000).toFixed(1)}s`);
            cooldowns.set(cdKey, now + cooldown * 1000);
        }

        // Reactions
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
        
