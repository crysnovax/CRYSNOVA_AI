// ── BAILEYS SOCKET METHODS AS COMMANDS ──────────────────────────────────────
module.exports = [

    // ── GET USER STATUS ──────────────────────────────────────────────────────
    {
        name: 'getstatus',
        alias: ['userstatus', 'statuscheck', 'viewstatus'],
        desc: 'Get a user\'s status message',
        category: 'Owner',
        owner: true,
        usage: 'getstatus <@user or phone>',
        reactions: { start: '👁️', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            let target;
            if (m.mentionedJid?.[0]) {
                target = m.mentionedJid[0];
            } else if (m.quoted?.sender) {
                target = m.quoted.sender;
            } else if (args[0]) {
                target = args[0].replace(/[^\d]/g, '') + '@s.whatsapp.net';
            }

            if (!target) {
                return reply(`${prefix}⊘ *Usage:* getstatus <@user or phone>`);
            }

            try {
                const status = await sock.getUserStatus(target);
                return reply(
                    `👁️ *Status for* @${target.split('@')[0]}\n\n` +
                    `${status.status || 'No status set'}`
                );
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── SET GROUP ICON ───────────────────────────────────────────────────────
    {
        name: 'setgroupicon',
        alias: ['setgrouppp', 'setgppicon', 'groupicon'],
        desc: 'Set group profile picture',
        category: 'Owner',
        owner: true,
        usage: 'setgroupicon (reply to image)',
        reactions: { start: '🖼️', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            if (!m.isGroup) {
                return reply(`${prefix}⊘ *Usage:* Only works in groups`);
            }

            if (!m.quoted?.mimetype?.startsWith('image/')) {
                return reply(`${prefix}⊘ *Usage:* Reply to an image`);
            }

            try {
                const image = await m.quoted.download();
                await sock.updateGroupPicture(m.chat, image);
                return reply(`✓ *Group icon updated*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── JOIN GROUP ───────────────────────────────────────────────────────────
    {
        name: 'joingroup',
        alias: ['join', 'joingc', 'inviteaccept', 'acceptinvite'],
        desc: 'Join a group using invite code',
        category: 'Owner',
        owner: true,
        usage: 'joingroup <invite_code>',
        reactions: { start: '🔗', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const code = args[0];

            if (!code) {
                return reply(`${prefix}⊘ *Usage:* joingroup <invite_code>`);
            }

            try {
                const result = await sock.groupAcceptInviteCode(code);
                return reply(`✓ *Joined group:* ${result}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── SET PRESENCE ─────────────────────────────────────────────────────────
    {
        name: 'presence',
        alias: ['setonline', 'online', 'status', 'activity'],
        desc: 'Set online presence status',
        category: 'Owner',
        owner: true,
        usage: 'presence <typing|recording|paused>',
        reactions: { start: '⏱️', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const status = args[0]?.toLowerCase();
            const valid = ['typing', 'recording', 'paused'];

            if (!status || !valid.includes(status)) {
                return reply(
                    `${prefix}⊘ *Usage:* presence typing|recording|paused\n\n` +
                    `Available statuses:\n` +
                    `• typing - Show typing\n` +
                    `• recording - Show recording audio\n` +
                    `• paused - Stop showing status`
                );
            }

            try {
                await sock.updateOnlinePresence(m.chat, status);
                return reply(`✓ *Presence set to:* ${status}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── EDIT MESSAGE ─────────────────────────────────────────────────────────
    {
        name: 'editmsg',
        alias: ['edit', 'editmessage', 'msgupdate'],
        desc: 'Edit a previously sent message',
        category: 'Owner',
        owner: true,
        usage: 'editmsg <new_text> (reply to message)',
        reactions: { start: '✏️', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const newText = args.join(' ');

            if (!newText) {
                return reply(`${prefix}⊘ *Usage:* editmsg <new_text>`);
            }

            if (!m.quoted?.key) {
                return reply(`${prefix}⊘ *Usage:* Reply to a message to edit it`);
            }

            try {
                await sock.editMessage(m.chat, m.quoted.key, { text: newText });
                return reply(`✓ *Message edited*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── DELETE FOR EVERYONE ──────────────────────────────────────────────────
    {
        name: 'deleteall',
        alias: ['del', 'delall', 'removemsg'],
        desc: 'Delete a message for everyone',
        category: 'Owner',
        owner: true,
        usage: 'deleteall (reply to message)',
        reactions: { start: '🗑️', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            if (!m.quoted?.key) {
                return reply(`${prefix}⊘ *Usage:* Reply to a message to delete it`);
            }

            try {
                await sock.sendMessage(m.chat, { delete: m.quoted.key });
                return reply(`✓ *Message deleted for everyone*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── CHECK WHATSAPP VERSION ───────────────────────────────────────────────
    {
        name: 'waversion',
        alias: ['version', 'waver', 'botversion', 'checkversion'],
        desc: 'Check WhatsApp and bot version info',
        category: 'Owner',
        owner: true,
        usage: 'waversion',
        reactions: { start: '📱', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            try {
                const wa = await sock.getWAVersionInfo?.();
                const info = {
                    version: wa?.version || 'Unknown',
                    connected: sock.state?.connection || 'Unknown',
                    platform: wa?.platform || 'WhatsApp',
                };

                return reply(
                    `📱 *Version Information*\n\n` +
                    `Platform: ${info.platform}\n` +
                    `WhatsApp: ${info.version}\n` +
                    `Bot Status: ${info.connected}`
                );
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    }

];
