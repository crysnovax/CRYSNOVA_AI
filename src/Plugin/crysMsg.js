const { getCommand } = require('./crysCmd');
const { getVar } = require('./configManager');
const chalk = require('chalk');

const cooldowns = new Map();

const normalizeJid = (jid = '') => jid.replace(/:\d+@/, '@');

// Reads BOTH .env AND runtime setvar — so both work
const isSudoUser = (sender) => {
    const fromEnv     = process.env.SUDO_NUMBERS || '';
    const fromRuntime = String(getVar('SUDO_NUMBERS') || '');
    const combined    = [fromEnv, fromRuntime].filter(Boolean).join(',');
    if (!combined.trim()) return false;
    const senderNum   = normalizeJid(sender).split('@')[0];
    return combined.split(',').map(n => n.trim()).filter(Boolean).some(n => n === senderNum);
};

const handleMessage = async (sock, m, store) => {
    try {
        if (!m || !m.message) return;
        if (m.key?.remoteJid === 'status@broadcast') return;

        const prefix    = getVar('PREFIX', '.');
        const autoReact = getVar('AUTO_REACT', true);
        const cooldown  = getVar('COOLDOWN', 3);

        const config = () => require('../../settings/config');
        const cfg    = config();

        // Owner resolution — reads process.env first, then getVar, then config
        const ownerRaw  = process.env.OWNER_NUMBER || getVar('OWNER_NUMBER', cfg.owner) || cfg.owner || '';
        const ownerNum  = normalizeJid(ownerRaw).split('@')[0];
        const senderNum = normalizeJid(m.sender || '').split('@')[0];
        const isOwner   = !!ownerNum && senderNum === ownerNum;
        const isSudo    = isOwner || isSudoUser(m.sender);

        const body = m.text || '';
        if (!body.startsWith(prefix)) return;

        const cmdName = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
        const args    = body.trim().split(/ +/).slice(1);
        const text    = args.join(' ');

        const cmd = getCommand(cmdName);
        if (!cmd) return;

        // Group metadata + proper admin checks (normalized JIDs)
        let groupMeta, isAdmin, isBotAdmin;
        if (m.isGroup) {
            groupMeta = await sock.groupMetadata(m.chat).catch(() => null);
            const admins    = (groupMeta?.participants || []).filter(p => p.admin).map(p => normalizeJid(p.id));
            const senderJid = normalizeJid(m.sender);
            const botJid    = normalizeJid(sock.user?.id || '');
            isAdmin    = admins.includes(senderJid);
            isBotAdmin = admins.includes(botJid);
        }

        const reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

        // Public/private gate
        if (!cfg.status.public && !isSudo) {
            if (autoReact) sock.sendMessage(m.chat, { react: { text: '⚉', key: m.key } }).catch(() => {});
            return;
        }

        if (cmd.ownerOnly  && !isOwner)             return reply(cfg.message.owner);
        if (cmd.sudoOnly   && !isSudo)              return reply(cfg.message.owner);
        if (cmd.groupOnly  && !m.isGroup)           return reply(cfg.message.group);
        if (cmd.privateOnly && m.isGroup)           return reply(cfg.message.private);
        if (cmd.adminOnly  && !isAdmin && !isSudo)  return reply(cfg.message.admin);
        if (cmd.botAdmin   && !isBotAdmin)          return reply('𓉤 Make me an admin first!');

        if (!isSudo && cooldown > 0) {
            const cdKey = `${m.sender}:${cmdName}`;
            const now   = Date.now();
            const exp   = cooldowns.get(cdKey);
            if (exp && now < exp) return reply(`🚀 Wait ${((exp - now) / 1000).toFixed(1)}s`);
            cooldowns.set(cdKey, now + cooldown * 1000);
        }

        if (autoReact) {
            sock.sendMessage(m.chat, { react: { text: cmd.reactions?.start || '✨', key: m.key } }).catch(() => {});
        }

        console.log(chalk.cyan(`[CMD] ${prefix}${cmdName} | ${senderNum}${isSudo && !isOwner ? ' [SUDO]' : isOwner ? ' [OWNER]' : ''}`));

        await cmd.execute(sock, m, {
            args, text, prefix,
            isOwner, isSudo, isAdmin, isBotAdmin,
            isGroup: m.isGroup, groupMeta,
            reply, config: cfg, store, getVar
        });

        if (global.crysStats) global.crysStats.commands++;

        if (autoReact) {
            sock.sendMessage(m.chat, { react: { text: cmd.reactions?.success || '🥏', key: m.key } }).catch(() => {});
        }

    } catch (err) {
        console.log(chalk.red('[MSG ERROR]'), err.message);
        sock.sendMessage(m.chat, { react: { text: '🙈', key: m.key } }).catch(() => {});
    }
};

module.exports = { handleMessage };
