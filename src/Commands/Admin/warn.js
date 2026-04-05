const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');   // ← added for overlay
const axios = require('axios');   // already used

const WARN_FILE = path.join(__dirname, '../../../database/warns.json');

let warns = {};

const loadWarns = () => {
    try {
        if (fs.existsSync(WARN_FILE))
            warns = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
    } catch (e) {
        console.error('[WARN LOAD ERROR]', e.message);
        warns = {};
    }
};

const saveWarns = () => {
    try { fs.writeFileSync(WARN_FILE, JSON.stringify(warns, null, 2)); }
    catch (e) { console.error('[WARN SAVE ERROR]', e.message); }
};

loadWarns();

const getTargetUser = (m, args) => {
    if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0];
    if (m.quoted && m.quoted.sender) return m.quoted.sender;
    if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, '');
        if (number.length >= 10) return `${number}@s.whatsapp.net`;
    }
    return null;
};

const getAdminLink = (config) => {
    const adminNum = config?.owner?.number || config?.owner || global.ownerNumber || null;
    if (!adminNum) return null;
    return `https://wa.me/${adminNum.toString().replace(/[^0-9]/g, '')}`;
};

// ────────── OVERLAY FUNCTION (realistic warning stamp) ──────────
async function addWarningOverlay(imageBuffer) {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;

        // 1. Semi‑transparent red overlay (40% opacity)
        const redOverlay = await sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 0.4 }
            }
        }).png().toBuffer();

        // 2. Diagonal “WARNING” text (SVG)
        const fontSize = Math.max(48, Math.floor(width / 6));
        const svgText = `
            <svg width="${width}" height="${height}">
                <style>
                    .warning-text {
                        font-family: 'Impact', 'Arial Black', sans-serif;
                        font-size: ${fontSize}px;
                        font-weight: bold;
                        fill: #FFD966;
                        stroke: #8B0000;
                        stroke-width: 3px;
                        paint-order: stroke;
                        text-anchor: middle;
                        dominant-baseline: middle;
                        transform: rotate(-25deg, ${width/2}, ${height/2});
                        letter-spacing: 4px;
                    }
                </style>
                <text x="50%" y="50%" class="warning-text">WARNING</text>
            </svg>
        `;
        const svgBuffer = Buffer.from(svgText);

        // 3. Composite everything
        const finalImage = await sharp(imageBuffer)
            .composite([
                { input: redOverlay, blend: 'over' },
                { input: svgBuffer, blend: 'over' }
            ])
            .jpeg({ quality: 92 })
            .toBuffer();

        return finalImage;
    } catch (err) {
        console.error('[OVERLAY ERROR]', err.message);
        return imageBuffer; // fallback: return original image
    }
}

const formatWarnMenu = (target, count, reason, config, prefix = '.') => {
    const username = target.split('@')[0];
    const isFinal  = count >= 3;
    const text =
        `╭─❍ *ಥ⁠‿⁠ಥ WARN SYSTEM*\n` +
        `│\n` +
        `│ 亗 User    : @${username}\n` +
        `│ ⚉ Warning : ${count}/3 ${'⚉'.repeat(count)}${'⚭'.repeat(3 - count)}\n` +
        `│ 𓄄 Reason  : ${reason}\n` +
        `│ ✦ Status  : ${isFinal ? '彡 CRITICAL 彡' : 'ACTIVE'}\n` +
        `╰──────────────────\n\n` +
        `ಠ_ಠ _This is an official warning from group administration_`;
    const buttons = [{
        buttonId: `${prefix}appeal`,
        buttonText: { displayText: 'ಥ⁠‿⁠ಥ Appeal Warn' },
        type: 1
    }];
    return { text, buttons };
};

const formatResetMenu = (target) => {
    const username = target.split('@')[0];
    return {
        text:
            `╭─❍ *WARN SYSTEM — CLEARED*\n` +
            `│\n` +
            `│ ✦ User    : @${username}\n` +
            `│ ⚉ Status  : All warnings removed\n` +
            `│ 𓄄 Record  : Clean slate\n` +
            `╰──────────────────`
    };
};

const formatStatusMenu = (target, count) => {
    const username    = target.split('@')[0];
    const progressBar = count > 0 ? '⚉'.repeat(count) + '⚭'.repeat(3 - count) : '⚭⚭⚭';
    const statusIcon  = count === 0 ? '㉨⁠' : count >= 3 ? '❏' : '⚉';
    return {
        text:
            `╭─❍ *WARN SYSTEM — STATUS*\n` +
            `│\n` +
            `│ 亗 User    : @${username}\n` +
            `│ ⚉ Warnings: ${count}/3 ${progressBar}\n` +
            `│ ${statusIcon} Status  : ${count === 0 ? 'Clean' : count >= 3 ? 'Critical' : 'On Watch'}\n` +
            `╰──────────────────`
    };
};

const formatHelpMenu = (prefix = '.') => ({
    text:
        `╭─❍ *WARN SYSTEM*\n` +
        `│\n` +
        `│ ⚉ *Commands:*\n` +
        `│ ➫ ${prefix}warn @user [reason]\n` +
        `│ ➫ ${prefix}resetwarn @user\n` +
        `│ ➫ ${prefix}warnings @user\n` +
        `│ ➫ ${prefix}appeal (DM only)\n` +
        `│\n` +
        `│ 𓄄 3 warnings = auto-kick\n` +
        `│ ✦ Warns persist even after rejoin\n` +
        `╰──────────────────`
});

module.exports = {
    name:     'warn',
    alias:    ['resetwarn', 'warnings', 'warns', 'clearwarn', 'appeal'],
    desc:     'Warning system with visual menu',
    category: 'group',
    usage:    '.warn @user [reason] | .resetwarn @user | .appeal',

    execute: async (sock, m, { args, reply, config, prefix, groupMeta, isGroup }) => {
        const groupJid = m.chat;
        const cmd      = m.body.toLowerCase().split(/\s+/)[0].replace(/^[.#\/!]/, '');

        if (!warns[groupJid]) warns[groupJid] = {};

        // ── Appeal ────────────────────────────────────────────
        if (cmd === 'appeal') {
            if (m.isGroup) {
                try {
                    const meta      = await sock.groupMetadata(m.chat).catch(() => null);
                    const groupName = meta?.subject || 'Unknown Group';
                    const userWarns = warns[groupJid]?.[m.sender] || 0;
                    await sock.sendMessage(m.sender, {
                        text:
                            `╭─❍ *ಠ_ಠ APPEAL REQUEST*\n│\n` +
                            `│ 亗 *Group:* ${groupName}\n` +
                            `│ ㉨⁠ *Your Warnings:* ${userWarns}/3\n│\n` +
                            `│ ✦ Type your appeal message here.\n` +
                            `│ ⚉ Be honest and explain your side.\n` +
                            `╰──────────────────\n\n` +
                            `ಥ⁠‿⁠ಥ _Type your appeal message below_`
                    });
                    return sock.sendMessage(m.chat, {
                        text: `╭─❍ *WARN SYSTEM*\n│\n│ ✦ @${m.sender.split('@')[0]}, check your DM to submit appeal\n╰──────────────────`,
                        mentions: [m.sender]
                    }, { quoted: m });
                } catch {
                    return reply('╭─❍ *WARN SYSTEM*\n│\n│ ✘ Could not send DM. Open chat with me privately.\n╰──────────────────');
                }
            } else {
                return reply(
                    `╭─❍ *APPEAL REQUEST*\n│\n` +
                    `│ ✦ You are in direct contact with the bot.\n` +
                    `│ ⚉ Type your appeal message below.\n` +
                    `│ 𓄄 Explain why your warn should be removed.\n` +
                    `╰──────────────────`
                );
            }
        }

        if (!m.isGroup) return reply('╭─❍ *WARN SYSTEM*\n│\n│ ✘ Group only command\n╰──────────────────');

        const target = getTargetUser(m, args);

        if (!target && cmd !== 'warnings' && cmd !== 'warns')
            return sock.sendMessage(m.chat, { text: formatHelpMenu(prefix).text }, { quoted: m });

        // ── Warn ──────────────────────────────────────────────
        if (cmd === 'warn') {
            const reason = args.slice(m.mentionedJid?.length ? 0 : 1).join(' ').trim() || 'Violation of group rules';
            warns[groupJid][target] = (warns[groupJid][target] || 0) + 1;
            const count = warns[groupJid][target];
            saveWarns();

            let ppBuffer = null;
            try {
                const ppUrl  = await sock.profilePictureUrl(target, 'image');
                if (ppUrl) {
                    const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 5000 });
                    ppBuffer  = Buffer.from(res.data);
                    // ✅ Apply premium warning overlay
                    ppBuffer = await addWarningOverlay(ppBuffer);
                }
            } catch {}

            const menu = formatWarnMenu(target, count, reason, config, prefix);

            if (ppBuffer) {
                await sock.sendMessage(m.chat, {
                    image:      ppBuffer,
                    caption:    menu.text,
                    buttons:    menu.buttons,
                    headerType: 1,
                    contextInfo: { mentionedJid: [target] }
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    text:       menu.text,
                    buttons:    menu.buttons,
                    headerType: 1,
                    mentions:   [target]
                }, { quoted: m });
            }

            if (count >= 3) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
                    await sock.sendMessage(m.chat, {
                        text:
                            `╭─❍ *ᄒ⁠ᴥ⁠ᄒ⁠ WARN SYSTEM — REMOVED 𓄄*\n│\n` +
                            `│ ✘ User    : @${target.split('@')[0]}\n` +
                            `│ ⚉ Reason  : 3/3 warnings reached\n` +
                            `│ 𓄄 Action  : Auto-kick executed\n` +
                            `│ ✦ Note    : Warns persist on rejoin\n` +
                            `╰──────────────────`,
                        mentions: [target]
                    });
                    saveWarns();
                } catch {
                    await sock.sendMessage(m.chat, {
                        text: `╭─❍ *WARN SYSTEM — ERROR*\n│\n│ ✘ Kick failed. Check bot admin rights.\n╰──────────────────`,
                        mentions: [target]
                    });
                }
            }
            return;
        }

        // ── Reset Warn ────────────────────────────────────────
        if (cmd === 'resetwarn' || cmd === 'clearwarn') {
            if (!warns[groupJid][target]) {
                return sock.sendMessage(m.chat, {
                    text: `╭─❍ *WARN SYSTEM*\n│\n│ ✘ @${target.split('@')[0]} has no warnings\n╰──────────────────`,
                    mentions: [target]
                }, { quoted: m });
            }
            delete warns[groupJid][target];
            saveWarns();
            await sock.sendMessage(m.chat, {
                text:     formatResetMenu(target).text,
                mentions: [target]
            }, { quoted: m });
            return;
        }

        // ── Check Warnings ────────────────────────────────────
        if (cmd === 'warnings' || cmd === 'warns') {
            const checkTarget = target || m.sender;
            const count       = warns[groupJid][checkTarget] || 0;
            await sock.sendMessage(m.chat, {
                text:     formatStatusMenu(checkTarget, count).text,
                mentions: [checkTarget]
            }, { quoted: m });
            return;
        }

        sock.sendMessage(m.chat, { text: formatHelpMenu(prefix).text }, { quoted: m });
    }
};

// ── Rejoin Notification ────────────────────────────────────────
module.exports.handleRejoin = async function(sock, groupJid, participantJid) {
    try {
        loadWarns();
        const count = warns[groupJid]?.[participantJid];
        if (!count || count === 0) return;
        await sock.sendMessage(groupJid, {
            text:
                `╭─❍ *⚉ WARN SYSTEM — REJOIN ALERT*\n│\n` +
                `│ 亗 @${participantJid.split('@')[0]} just rejoined\n` +
                `│ ⚉ They have *${count}/3* active warnings\n` +
                `│ 𓄄 Their warn record was NOT reset\n` +
                `╰──────────────────`,
            mentions: [participantJid]
        });
    } catch {}
};
