// ── ALL PROFILE & PRIVACY COMMANDS ──────────────────────────────────────
module.exports = [
    // ── UPDATE LAST SEEN PRIVACY ─────────────────────────────────────────
    {
        name: 'lastseen',
        alias: ['setlastseen', 'lastseenprivacy'],
        desc: 'Update who can see your last seen',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.lastseen <all/contacts/nobody>',
        examples: ['.lastseen all', '.lastseen contacts', '.lastseen nobody'],
        reactions: { start: '👁️', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['all', 'contacts', 'nobody'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .lastseen all/contacts/nobody\n\nOptions:\n• all - Everyone\n• contacts - Only contacts\n• nobody - No one`);
            }

            await sock.sendMessage(m.chat, { react: { text: '👁️', key: m.key } });

            try {
                await sock.updateLastSeenPrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Last seen privacy set to:* ${setting.toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE ONLINE PRIVACY ────────────────────────────────────────────
    {
        name: 'setonline',
        alias: ['onlineprivacy', 'ponline'],
        desc: 'Update who can see when you\'re online',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.online <all/match_last_seen>',
        examples: ['.online all', '.online match_last_seen'],
        reactions: { start: '🟢', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['all', 'match_last_seen'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .online all/match_last_seen\n\nOptions:\n• all - Everyone\n• match_last_seen - Same as last seen setting`);
            }

            await sock.sendMessage(m.chat, { react: { text: '🟢', key: m.key } });

            try {
                await sock.updateOnlinePrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Online privacy set to:* ${setting.replace('_', ' ').toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE PROFILE PICTURE PRIVACY ───────────────────────────────────
    {
        name: 'pfpprivacy',
        alias: ['setpfpprivacy', 'profilepicprivacy'],
        desc: 'Update who can see your profile picture',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.pfpprivacy <contacts/everyone/nobody>',
        examples: ['.pfpprivacy contacts', '.pfpprivacy everyone', '.pfpprivacy nobody'],
        reactions: { start: '🖼️', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['contacts', 'everyone', 'nobody'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .pfpprivacy contacts/everyone/nobody`);
            }

            await sock.sendMessage(m.chat, { react: { text: '🖼️', key: m.key } });

            try {
                await sock.updateProfilePicturePrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Profile picture privacy set to:* ${setting.toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE STATUS PRIVACY ────────────────────────────────────────────
    {
        name: 'statusprivacy',
        alias: ['setstatusprivacy', 'whocansee'],
        desc: 'Update who can see your status updates',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.statusprivacy <all/contacts/contacts_blacklist/none>',
        examples: ['.statusprivacy contacts', '.statusprivacy all', '.statusprivacy none'],
        reactions: { start: '📱', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['all', 'contacts', 'contacts_blacklist', 'none'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .statusprivacy all/contacts/contacts_blacklist/none\n\nOptions:\n• all - Everyone\n• contacts - Only contacts\n• contacts_blacklist - Contacts except blacklisted\n• none - No one`);
            }

            await sock.sendMessage(m.chat, { react: { text: '📱', key: m.key } });

            try {
                await sock.updateStatusPrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Status privacy set to:* ${setting.replace('_', ' ').toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE GROUPS ADD PRIVACY ────────────────────────────────────────
    {
        name: 'groupprivacy',
        alias: ['setgroupprivacy', 'whocanadd', 'groupadd'],
        desc: 'Update who can add you to groups',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.groupprivacy <all/contacts/contacts_blacklist/none>',
        examples: ['.groupprivacy contacts', '.groupprivacy all', '.groupprivacy none'],
        reactions: { start: '👥', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['all', 'contacts', 'contacts_blacklist', 'none'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .groupprivacy all/contacts/contacts_blacklist/none\n\nOptions:\n• all - Everyone\n• contacts - Only contacts\n• contacts_blacklist - Contacts except blacklisted\n• none - No one`);
            }

            await sock.sendMessage(m.chat, { react: { text: '👥', key: m.key } });

            try {
                await sock.updateGroupsAddPrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Groups add privacy set to:* ${setting.replace('_', ' ').toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE READ RECEIPTS PRIVACY ─────────────────────────────────────
    {
        name: 'readreceipts',
        alias: ['setreadreceipts', 'readprivacy'],
        desc: 'Update read receipts (blue ticks) privacy',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.readreceipts <all/none>',
        examples: ['.readreceipts all', '.readreceipts none'],
        reactions: { start: '💙', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['all', 'none'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .readreceipts all/none\n\nOptions:\n• all - Send read receipts\n• none - Disable read receipts`);
            }

            await sock.sendMessage(m.chat, { react: { text: '💙', key: m.key } });

            try {
                await sock.updateReadReceiptsPrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Read receipts set to:* ${setting.toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE CALL PRIVACY ──────────────────────────────────────────────
    {
        name: 'callsprivacy',
        alias: ['setcallsprivacy', 'whocancall'],
        desc: 'Update who can call you',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.callsprivacy <everyone/contacts/contacts_blacklist/none>',
        examples: ['.callsprivacy contacts', '.callsprivacy everyone', '.callsprivacy none'],
        reactions: { start: '📞', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const setting = args[0]?.toLowerCase();
            const valid = ['everyone', 'contacts', 'contacts_blacklist', 'none'];

            if (!setting || !valid.includes(setting)) {
                return reply(`⊘ *Usage:* .callsprivacy everyone/contacts/contacts_blacklist/none`);
            }

            await sock.sendMessage(m.chat, { react: { text: '📞', key: m.key } });

            try {
                await sock.updateCallPrivacy(setting);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Call privacy set to:* ${setting.replace('_', ' ').toUpperCase()}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UPDATE DEFAULT DISAPPEARING MODE ─────────────────────────────────
    {
        name: 'disappearing',
        alias: ['setdisappearing', 'defaulttimer', 'settimer'],
        desc: 'Set default disappearing message timer (seconds)',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.disappearing <seconds>',
        examples: ['.disappearing 86400', '.disappearing 0', '.disappearing 604800'],
        reactions: { start: '⏳', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            const seconds = parseInt(args[0]);
            
            if (isNaN(seconds) || seconds < 0) {
                return reply(`⊘ *Usage:* .disappearing <seconds>\n\nCommon values:\n• 0 - Off\n• 86400 - 24 hours\n• 604800 - 7 days\n• 2592000 - 30 days`);
            }

            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            try {
                await sock.updateDefaultDisappearingMode(seconds);
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                
                let displayTime = seconds === 0 ? 'OFF' : seconds === 86400 ? '24 hours' : seconds === 604800 ? '7 days' : seconds === 2592000 ? '30 days' : `${seconds} seconds`;
                return reply(`✓ *Default disappearing mode set to:* ${displayTime}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── VIEW ALL PRIVACY SETTINGS (RICH TABLE) ───────────────────────────
    {
        name: 'myprivacy',
        alias: ['privacysettings', 'viewprivacy'],
        desc: 'View all your current privacy settings',
        category: 'Privacy',
        ownerOnly: true,
        usage: '.myprivacy',
        examples: ['.myprivacy'],
        reactions: { start: '🔒', success: '🍃', error: '🥵' },

        execute: async (sock, m, { reply }) => {
            await sock.sendMessage(m.chat, { react: { text: '🔒', key: m.key } });

            try {
                const settings = await sock.fetchPrivacySettings(true);
                
                if (!settings) {
                    return reply('⊘ *Could not fetch privacy settings*');
                }

                await sock.sendMessage(m.chat, {
                    headerText: `## 🔒 My Privacy Settings`,
                    contentText: '---',
                    title: '⚉ Privacy Dashboard',
                    table: [
                        ['👁️ Last Seen', settings.lastSeen || 'N/A'],
                        ['🟢 Online', settings.online || 'N/A'],
                        ['🖼️ Profile Picture', settings.profilePicture || 'N/A'],
                        ['📱 Status', settings.status || 'N/A'],
                        ['👥 Groups Add', settings.groupsAdd || 'N/A'],
                        ['📞 Calls', settings.calls || 'N/A'],
                        ['💙 Read Receipts', settings.readReceipts || 'N/A'],
                        ['⏳ Disappearing', settings.disappearingMode ? `${settings.disappearingMode} sec` : 'N/A']
                    ],
                    footerText: '💡 Use .help privacy for commands'
                }, { quoted: m });

                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });

            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── BLOCK USER ───────────────────────────────────────────────────────
    {
        name: 'block',
        alias: ['blockuser'],
        desc: 'Block a user',
        category: 'Moderation',
        ownerOnly: true,
        usage: '.block (reply to user) or .block @user or .block <jid>',
        examples: ['.block (reply to message)', '.block 2348077134210@s.whatsapp.net'],
        reactions: { start: '🚫', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            let targetJid = args[0];
            
            if (m.quoted) {
                targetJid = m.quoted.sender || m.quoted.participant || m.quoted.key?.participant;
            } else if (m.mentionedJid?.length) {
                targetJid = m.mentionedJid[0];
            } else if (!targetJid?.includes('@')) {
                targetJid = `${targetJid}@s.whatsapp.net`;
            }

            if (!targetJid) {
                return reply('⊘ *Reply to a user, mention them, or provide their JID!*');
            }

            await sock.sendMessage(m.chat, { react: { text: '🚫', key: m.key } });

            try {
                await sock.updateBlockStatus(targetJid, 'block');
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Blocked:* ${targetJid.split('@')[0]}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── UNBLOCK USER ─────────────────────────────────────────────────────
    {
        name: 'unblock',
        alias: ['unblockuser'],
        desc: 'Unblock a user',
        category: 'Moderation',
        ownerOnly: true,
        usage: '.unblock (reply to user) or .unblock @user or .unblock <jid>',
        examples: ['.unblock (reply to message)', '.unblock 2348077134210@s.whatsapp.net'],
        reactions: { start: '🔓', success: '🍃', error: '🥵' },

        execute: async (sock, m, { args, reply }) => {
            let targetJid = args[0];
            
            if (m.quoted) {
                targetJid = m.quoted.sender || m.quoted.participant || m.quoted.key?.participant;
            } else if (m.mentionedJid?.length) {
                targetJid = m.mentionedJid[0];
            } else if (!targetJid?.includes('@')) {
                targetJid = `${targetJid}@s.whatsapp.net`;
            }

            if (!targetJid) {
                return reply('⊘ *Reply to a user, mention them, or provide their JID!*');
            }

            await sock.sendMessage(m.chat, { react: { text: '🔓', key: m.key } });

            try {
                await sock.updateBlockStatus(targetJid, 'unblock');
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(`✓ *Unblocked:* ${targetJid.split('@')[0]}`);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    },

    // ── FETCH BLOCKLIST ──────────────────────────────────────────────────
    {
        name: 'blocklist',
        alias: ['blocked', 'blockedlist', 'myblocks'],
        desc: 'Get list of blocked users',
        category: 'Moderation',
        ownerOnly: true,
        usage: '.blocklist',
        examples: ['.blocklist'],
        reactions: { start: '📋', success: '🍃', error: '🥵' },

        execute: async (sock, m, { reply }) => {
            await sock.sendMessage(m.chat, { react: { text: '📋', key: m.key } });

            try {
                const blocked = await sock.fetchBlocklist();
                
                if (!blocked || blocked.length === 0) {
                    await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                    return reply(`📋 *Blocklist*\n\nNo blocked users found.`);
                }

                let text = `🚫 *BLOCKED USERS*\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
                for (let i = 0; i < blocked.length; i++) {
                    const jid = blocked[i];
                    const number = jid.split('@')[0];
                    text += `${i+1}. ${number}\n`;
                }
                text += `━━━━━━━━━━━━━━━━━━━━━━\nTotal: ${blocked.length} blocked`;
                
                await sock.sendMessage(m.chat, { react: { text: '🍃', key: m.key } });
                return reply(text);
            } catch (err) {
                await sock.sendMessage(m.chat, { react: { text: '🥵', key: m.key } });
                return reply(`⊘ *Error:* ${err.message}`);
            }
        }
    }
];
