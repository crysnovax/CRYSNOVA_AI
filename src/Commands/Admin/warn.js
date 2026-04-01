const fs = require('fs');
const path = require('path');

const WARN_FILE = path.join(__dirname, '../../../database/warns.json');

let warns = {};

// Load existing warns
const loadWarns = () => {
    try {
        if (fs.existsSync(WARN_FILE)) {
            warns = JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[WARN LOAD ERROR]', e.message);
        warns = {};
    }
};

// Save warns to file
const saveWarns = () => {
    try {
        fs.writeFileSync(WARN_FILE, JSON.stringify(warns, null, 2));
    } catch (e) {
        console.error('[WARN SAVE ERROR]', e.message);
    }
};

// Initialize on load
loadWarns();

// Helper: Get target user from mentions or args
const getTargetUser = (m, args) => {
    // First check mentions - this is the most reliable way
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        return m.mentionedJid[0];
    }
    
    // Check quoted message sender
    if (m.quoted && m.quoted.sender) {
        return m.quoted.sender;
    }
    
    // Check for number in args
    if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, '');
        if (number.length >= 10) {
            return `${number}@s.whatsapp.net`;
        }
    }
    
    return null;
};

// Helper: Get admin contact link from config
const getAdminLink = (config) => {
    const adminNum = config?.owner?.number || config?.owner || global.ownerNumber || null;
    if (!adminNum) return null;
    const cleanNum = adminNum.toString().replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum}`;
};

// Helper: Format warning menu with only appeal button
const formatWarnMenu = (target, count, reason, config, prefix = '.') => {
    const username = target.split('@')[0];
    const adminLink = getAdminLink(config);
    const isFinal = count >= 3;
    
    // Red text styling using Unicode and formatting
    const redText = (text) => `ಥ⁠‿⁠ಥ ${text}`;
    
    let text = 
        `╭─❍ *${redText('WARN SYSTEM')}*\n` +
        `│\n` +
        `│ 亗 User    : @${username}\n` +
        `│ ⚉ Warning : ${count}/3 ${'⚉'.repeat(count)}${'⚭'.repeat(3 - count)}\n` +
        `│ 𓄄 Reason  : ${reason}\n` +
        `│ ✦ Status  : ${isFinal ? '彡 CRITICAL 彡' : 'ACTIVE'}\n` +
        `╰──────────────────\n\n` +
        `ಠ_ಠ _This is an official warning from group administration_`;

    const buttons = [];

    // Appeal button only - sends .appeal command when clicked
    buttons.push({
        buttonId: `${prefix}appeal`,
        buttonText: { displayText: 'ಥ⁠‿⁠ಥ Appeal Warn' },
        type: 1
    });

    return { text, buttons };
};

// Helper: Format reset menu (no buttons)
const formatResetMenu = (target) => {
    const username = target.split('@')[0];
    
    const text = 
        `╭─❍ *WARN SYSTEM — CLEARED*\n` +
        `│\n` +
        `│ ✦ User    : @${username}\n` +
        `│ ⚉ Status  : All warnings removed\n` +
        `│ 𓄄 Record  : Clean slate\n` +
        `╰──────────────────`;

    return { text };
};

// Helper: Format status check
const formatStatusMenu = (target, count) => {
    const username = target.split('@')[0];
    const progressBar = count > 0 ? '⚉'.repeat(count) + '⚭'.repeat(3 - count) : '⚭⚭⚭';
    const statusColor = count === 0 ? '㉨⁠' : count >= 3 ? '❏' : '⚉';
    
    return {
        text:
            `╭─❍ *WARN SYSTEM — STATUS*\n` +
            `│\n` +
            `│ 亗 User    : @${username}\n` +
            `│ ⚉ Warnings: ${count}/3 ${progressBar}\n` +
            `│ ${statusColor} Status  : ${count === 0 ? 'Clean' : count >= 3 ? 'Critical' : 'On Watch'}\n` +
            `╰──────────────────`
    };
};

// Helper: Format help menu
const formatHelpMenu = (prefix = '.') => {
    return {
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
            `│ ✦ Appeal via admin button\n` +
            `╰──────────────────`
    };
};

module.exports = {
    name: 'warn',
    alias: ['resetwarn', 'warnings', 'warns', 'clearwarn', 'appeal'],
    desc: 'Warning system with visual menu',
    category: 'group',
    usage: '.warn @user [reason] | .resetwarn @user | .appeal',

    execute: async (sock, m, { args, reply, config, prefix, groupMeta, isGroup }) => {
        
        const groupJid = m.chat;
        const cmd = m.body.toLowerCase().split(/\s+/)[0].replace(/^[.#\/!]/, '');
        
        // Initialize group warns
        if (!warns[groupJid]) warns[groupJid] = {};

        // Handle appeal command - WORKS IN DM ONLY (private mode)
        if (cmd === 'appeal') {
            // If used in group, fetch group info and send DM to user
            if (m.isGroup) {
                try {
                    // Get fresh group metadata
                    const meta = await sock.groupMetadata(m.chat).catch(() => null);
                    const groupName = meta?.subject || 'Unknown Group';
                    const memberCount = meta?.participants?.length || 'Unknown';
                    const groupDesc = meta?.desc || 'No description';
                    
                    // Get user's warning info
                    const userWarns = warns[groupJid]?.[m.sender] || 0;
                    
                    // Send appeal info to user's DM with group details
                    await sock.sendMessage(m.sender, {
                        text:
                            `╭─❍ *ಠ_ಠ APPEAL REQUEST*\n` +
                            `│\n` +
                            `│ 亗 *Group:* ${groupName}\n` +
                            `│ ❏◦ *Members:* ${memberCount}\n` +
                            `│ 𓄄 *Description:* ${groupDesc.substring(0, 50)}${groupDesc.length > 50 ? '...' : ''}\n` +
                            `│\n` +
                            `│ ㉨⁠ *Your Warnings:* ${userWarns}/3\n` +
                            `│\n` +
                            `│ ✦ Submit an appeal message here.\n` +
                            `│ ⚉ If accepted, your warn count will be reset.\n` +
                            `│ 𓄄 Be honest and explain your side.\n` +
                            `╰──────────────────\n\n` +
                            `ಥ⁠‿⁠ಥ _Type your appeal message below_`
                    });
                    
                    // Confirm in group that DM was sent
                    return sock.sendMessage(m.chat, {
                        text: `╭─❍ *WARN SYSTEM*\n│\n│ ✦ @${m.sender.split('@')[0]}, check your DM to submit appeal\n╰──────────────────`,
                        mentions: [m.sender]
                    }, { quoted: m });
                    
                } catch (err) {
                    return reply('╭─❍ *WARN SYSTEM*\n│\n│ ✘ Could not send DM. Please open chat with me privately.\n╰──────────────────');
                }
            } else {
                // Already in DM, show appeal instructions
                return reply(
                    `╭─❍ *⁠☞⁠ ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠)⁠☞ APPEAL REQUEST*\n` +
                    `│\n` +
                    `│ ✦ You are in direct contact with the bot.\n` +
                    `│ ⚉ Type your appeal message below.\n` +
                    `│ 𓄄 Explain why your warn should be removed.\n` +
                    `│\n` +
                    `│ ಥ⁠‿⁠ಥ _Be honest and clear in your appeal_\n` +
                    `╰──────────────────`
                );
            }
        }

        // Group validation for all other commands
        if (!m.isGroup) {
            return reply('╭─❍ *WARN SYSTEM*\n│\n│ ✘ Group only command\n╰──────────────────');
        }

        // Get target user
        const target = getTargetUser(m, args);
        
        // Show help if no target provided (except for warnings command)
        if (!target && cmd !== 'warnings' && cmd !== 'warns') {
            const help = formatHelpMenu(prefix);
            return sock.sendMessage(m.chat, {
                text: help.text,
                footer: 'ಠ_ಠ CRYSNOVA WARN SYSTEM'
            }, { quoted: m });
        }

        // Handle warn command
        if (cmd === 'warn') {
            const reason = args.slice(m.mentionedJid?.length ? 0 : 1).join(' ').trim() || 'Violation of group rules';
            
            // Increment warning
            warns[groupJid][target] = (warns[groupJid][target] || 0) + 1;
            const count = warns[groupJid][target];
            
            saveWarns();

            // Try to get profile picture for visual warning
            let ppBuffer = null;
            try {
                const ppUrl = await sock.profilePictureUrl(target, 'image');
                if (ppUrl) {
                    const axios = require('axios');
                    const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 5000 });
                    ppBuffer = Buffer.from(res.data);
                }
            } catch {
                ppBuffer = null;
            }

            const menu = formatWarnMenu(target, count, reason, config, prefix);
            
            // Send warning with or without image
            if (ppBuffer) {
                await sock.sendMessage(m.chat, {
                    image: ppBuffer,
                    caption: menu.text,
                    buttons: menu.buttons,
                    headerType: 1,
                    contextInfo: {
                        mentionedJid: [target],
                        externalAdReply: {
                            title: `⚠ WARNING ${count}/3`,
                            body: `User: ${target.split('@')[0]}`,
                            thumbnail: ppBuffer,
                            sourceUrl: getAdminLink(config) || ''
                        }
                    }
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    text: menu.text,
                    buttons: menu.buttons,
                    headerType: 1,
                    mentions: [target]
                }, { quoted: m });
            }

            // Auto-kick on 3rd warning
            if (count >= 3) {
                try {
                    await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
                    
                    // Send kick confirmation with red styling
                    await sock.sendMessage(m.chat, {
                        text:
                            `╭─❍ *ᄒ⁠ᴥ⁠ᄒ⁠ WARN SYSTEM — REMOVED 𓄄*\n` +
                            `│\n` +
                            `│ ✘ User    : @${target.split('@')[0]}\n` +
                            `│ ⚉ Reason  : 3/3 warnings reached\n` +
                            `│ 𓄄 Action  : Auto-kick executed\n` +
                            `╰──────────────────`,
                        mentions: [target]
                    });
                    
                    delete warns[groupJid][target];
                    saveWarns();
                    
                } catch (err) {
                    await sock.sendMessage(m.chat, {
                        text:
                            `╭─❍ *WARN SYSTEM — ERROR*\n` +
                            `│\n` +
                            `│ ✘ Kick failed for @${target.split('@')[0]}\n` +
                            `│ ⚉ Check bot admin rights\n` +
                            `╰──────────────────`,
                        mentions: [target]
                    });
                }
            }
            
            return;
        }

        // Handle resetwarn/clearwarn command
        if (cmd === 'resetwarn' || cmd === 'clearwarn') {
            if (!target) {
                return sock.sendMessage(m.chat, {
                    text:
                        `╭─❍ *WARN SYSTEM*\n` +
                        `│\n` +
                        `│ ✘ Please mention a user\n` +
                        `│ ⚉ Usage: ${prefix}resetwarn @user\n` +
                        `╰──────────────────`
                }, { quoted: m });
            }

            if (!warns[groupJid][target]) {
                const username = target.split('@')[0];
                return sock.sendMessage(m.chat, {
                    text:
                        `╭─❍ *WARN SYSTEM*\n` +
                        `│\n` +
                        `│ ✘ @${username} has no warnings\n` +
                        `╰──────────────────`,
                    mentions: [target]
                }, { quoted: m });
            }

            delete warns[groupJid][target];
            saveWarns();

            const menu = formatResetMenu(target);
            
            await sock.sendMessage(m.chat, {
                text: menu.text,
                mentions: [target]
            }, { quoted: m });
            
            return;
        }

        // Handle warnings/warns command (view status)
        if (cmd === 'warnings' || cmd === 'warns') {
            const checkTarget = target || m.sender;
            const count = warns[groupJid][checkTarget] || 0;
            const status = formatStatusMenu(checkTarget, count);
            
            await sock.sendMessage(m.chat, {
                text: status.text,
                mentions: [checkTarget]
            }, { quoted: m });
            
            return;
        }

        // Fallback to help
        const help = formatHelpMenu(prefix);
        return sock.sendMessage(m.chat, {
            text: help.text,
            footer: '𓉤 CRYSNOVA WARN SYSTEM'
        }, { quoted: m });
    }
};
                
