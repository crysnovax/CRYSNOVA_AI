/**

 * CRYSNOVA AI V2.0 - Message Handler (Kord-style routing)

 */

const { getCommand } = require('./crysCmd');

const { getVar } = require('./configManager');

const chalk = require('chalk');

const cooldowns = new Map();

const handleMessage = async (sock, m, store) => {

    try {

        if (!m || !m.message) return;

        if (m.key?.remoteJid === 'status@broadcast') return;

        const config = () => require('../../settings/config');

        const prefix    = getVar('prefix', '.');

        const autoReact = getVar('autoReact', true);

        const cooldown  = getVar('cooldown', 3);

        const ownerNum  = getVar('ownerNumber', config().owner);

        const isOwner   = m.sender?.startsWith(ownerNum) || false;

        const body = m.text || '';

        if (!body.startsWith(prefix)) return;

        const cmdName = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();

        const args    = body.trim().split(/ +/).slice(1);

        const text    = args.join(' ');

        const cmd = getCommand(cmdName);

        if (!cmd) return;

        // Group info

        let groupMeta, isAdmin, isBotAdmin;

        if (m.isGroup) {

            groupMeta   = await sock.groupMetadata(m.chat).catch(() => null);

            const admins = (groupMeta?.participants || []).filter(p => p.admin).map(p => p.id);

            isAdmin     = admins.includes(m.sender);

            isBotAdmin  = admins.includes(sock.user?.id);

        }

        const reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        // ── PRIVATE MODE SILENT ─────────────────────────

        if (!config().status.public && !isOwner) {

            // Just react with ⚉ and do nothing

            if (autoReact) sock.sendMessage(m.chat, { react: { text: '⚉', key: m.key } }).catch(() => {});

            return;

        }

        // Permission checks

        if (cmd.ownerOnly && !isOwner)     return reply(config().message.owner);

        if (cmd.groupOnly && !m.isGroup)   return reply(config().message.group);

        if (cmd.adminOnly && !isAdmin && !isOwner) return reply(config().message.admin);

        if (cmd.botAdmin  && !isBotAdmin)  return reply('⚠️ Make me an admin first!');

        // Cooldown

        if (!isOwner && cooldown > 0) {

            const key = `${m.sender}:${cmdName}`;

            const now = Date.now();

            const exp = cooldowns.get(key);

            if (exp && now < exp) {

                return reply(`⏳ Wait ${((exp - now) / 1000).toFixed(1)}s`);

            }

            cooldowns.set(key, now + cooldown * 1000);

        }

        // React processing

        if (autoReact) sock.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } }).catch(() => {});

        console.log(chalk.cyan(`[CMD] .${cmdName} | ${m.sender?.split('@')[0]}`));

        await cmd.execute(sock, m, {

            args, text, prefix, isOwner, isAdmin, isBotAdmin,

            isGroup: m.isGroup, groupMeta, reply, config: config(),

            store, getVar

        });

        if (autoReact) sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

    } catch (err) {

        console.log(chalk.red('[MSG ERROR]'), err.message);

        sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});

    }

};

module.exports = { handleMessage };