const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return {};
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeJid(jid = '') {
    return jid.replace(/:\d+@/, '@');
}

function createAntiMessageModeration({
    command,
    label,
    description,
    databaseName,
    warningDatabaseName,
    detector,
    violationLabel,
    aliases = []
}) {
    const dbPath = path.join(process.cwd(), 'database', databaseName);
    const warningDbPath = path.join(process.cwd(), 'database', warningDatabaseName);

    function ensureConfig(db, group) {
        if (!db[group]) db[group] = { enabled: false, action: 'delete' };
        if (typeof db[group].enabled !== 'boolean') db[group].enabled = false;
        if (!['delete', 'warn', 'kick'].includes(db[group].action)) db[group].action = 'delete';
        return db[group];
    }

    const plugin = {
        name: command,
        alias: aliases,
        desc: description,
        category: 'Admin',
        groupOnly: true,
        adminOnly: true,
        reactions: { start: '🛡️', success: '✅' },

        execute: async (sock, m, { args, reply }) => {
            const db = readJson(dbPath);
            const group = m.chat;
            const config = ensureConfig(db, group);
            const subcommand = args[0]?.toLowerCase();

            if (!subcommand) {
                const action = config.action === 'warn' ? 'WARN (3x → KICK)' : config.action.toUpperCase();
                return reply(
                    `*${label} Settings*\n\n` +
                    `• Status : ${config.enabled ? 'ON' : 'OFF'}\n` +
                    `• Action : ${action}\n\n` +
                    `Commands:\n` +
                    `• .${command} on / off\n` +
                    `• .${command} delete / warn / kick\n` +
                    `• .${command} resetwarn @user`
                );
            }

            if (subcommand === 'on' || subcommand === 'off') {
                config.enabled = subcommand === 'on';
                writeJson(dbPath, db);
                return reply(`*${label}* ${config.enabled ? 'enabled' : 'disabled'}.`);
            }

            if (['delete', 'warn', 'kick'].includes(subcommand)) {
                config.action = subcommand;
                writeJson(dbPath, db);
                const detail = subcommand === 'warn' ? '3 warnings = automatic kick' : `${subcommand} violating messages`;
                return reply(`*${label} action:* ${subcommand.toUpperCase()} (${detail}).`);
            }

            if (subcommand === 'resetwarn') {
                const mentioned = m.mentionedJid?.[0];
                if (!mentioned) return reply(`Usage: .${command} resetwarn @user`);

                const warnings = readJson(warningDbPath);
                const warningKey = `${group}_${normalizeJid(mentioned)}`;
                if (!warnings[warningKey]) return reply('User has no warnings.');

                delete warnings[warningKey];
                writeJson(warningDbPath, warnings);
                return reply(`Warnings reset for @${mentioned.split('@')[0]}`, { mentions: [mentioned] });
            }

            return reply(`Usage: .${command} on | off | delete | warn | kick | resetwarn @user`);
        }
    };

    plugin.handleModeration = async function handleModeration(sock, m, mek) {
        try {
            if (!m.isGroup || m.key?.fromMe || !detector(mek?.message || m.message || {})) return false;

            const db = readJson(dbPath);
            const config = db[m.chat];
            if (!config?.enabled) return false;

            const sender = m.sender;
            if (!sender) return false;

            const metadata = await sock.groupMetadata(m.chat).catch(() => null);
            if (!metadata?.participants) return false;

            const senderNormalized = normalizeJid(sender);
            const isAdmin = metadata.participants.some(participant =>
                (participant.admin === 'admin' || participant.admin === 'superadmin') &&
                normalizeJid(participant.id) === senderNormalized
            );
            if (isAdmin) return false;

            const action = ['delete', 'warn', 'kick'].includes(config.action) ? config.action : 'delete';
            await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {});

            if (action === 'delete') {
                await sock.sendMessage(m.chat, {
                    text: `@${sender.split('@')[0]} ${violationLabel} are not allowed here. Message deleted.`,
                    mentions: [sender]
                }).catch(() => {});
                return true;
            }

            if (action === 'kick') {
                await sock.sendMessage(m.chat, {
                    text: `@${sender.split('@')[0]} was removed for ${violationLabel}.`,
                    mentions: [sender]
                }).catch(() => {});
                await sock.groupParticipantsUpdate(m.chat, [sender], 'remove').catch(() => {});
                return true;
            }

            const warnings = readJson(warningDbPath);
            const warningKey = `${m.chat}_${senderNormalized}`;
            const count = (warnings[warningKey]?.count || 0) + 1;

            if (count >= 3) {
                delete warnings[warningKey];
                writeJson(warningDbPath, warnings);
                await sock.sendMessage(m.chat, {
                    text: `@${sender.split('@')[0]} was removed after 3/3 warnings for ${violationLabel}.`,
                    mentions: [sender]
                }).catch(() => {});
                await sock.groupParticipantsUpdate(m.chat, [sender], 'remove').catch(() => {});
            } else {
                warnings[warningKey] = { count, user: senderNormalized };
                writeJson(warningDbPath, warnings);
                await sock.sendMessage(m.chat, {
                    text: `@${sender.split('@')[0]} warning ${count}/3: ${violationLabel} are not allowed.`,
                    mentions: [sender]
                }).catch(() => {});
            }

            return true;
        } catch (error) {
            console.error(`[${command.toUpperCase()} ERROR]`, error.message);
            return false;
        }
    };

    return plugin;
}

module.exports = { createAntiMessageModeration, normalizeJid };
