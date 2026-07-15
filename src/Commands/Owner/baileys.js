// ── BAILEYS SOCKET METHODS AS COMMANDS ──────────────────────────────────────
module.exports = [

    // ── BLOCK USER ───────────────────────────────────────────────────────────
    {
        name: 'block',
        alias: ['blockuser', 'blockjid'],
        desc: 'Block a user from messaging you',
        category: 'Owner',
        owner: true,
        usage: 'block <@user or phone>',
        reactions: { start: '🚫', success: '✓', error: '❌' },

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
                return reply(`${prefix}⊘ *Usage:* block <@user or phone>`);
            }

            try {
                await sock.updateBlockStatus(target, 'block');
                return reply(`✓ *Blocked:* @${target.split('@')[0]}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── UNBLOCK USER ─────────────────────────────────────────────────────────
    {
        name: 'unblock',
        alias: ['unblockuser', 'unblockjid'],
        desc: 'Unblock a user from messaging you',
        category: 'Owner',
        owner: true,
        usage: 'unblock <@user or phone>',
        reactions: { start: '🔓', success: '✓', error: '❌' },

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
                return reply(`${prefix}⊘ *Usage:* unblock <@user or phone>`);
            }

            try {
                await sock.updateBlockStatus(target, 'unblock');
                return reply(`✓ *Unblocked:* @${target.split('@')[0]}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── GET BLOCKED USERS ────────────────────────────────────────────────────
    {
        name: 'blocklist',
        alias: ['blocked', 'getblocked', 'blockstatus'],
        desc: 'View all blocked users',
        category: 'Owner',
        owner: true,
        usage: 'blocklist',
        reactions: { start: '📋', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            try {
                const store = sock.store?.contactsDB;
                if (!store) {
                    return reply(`${prefix}⊘ No contact database available`);
                }

                const blocked = Object.values(store)
                    .filter(contact => contact?.blocked === true)
                    .map(contact => `• @${contact.id.split('@')[0]}`)
                    .join('\n');

                if (!blocked) {
                    return reply(`${prefix}ℹ No blocked users`);
                }

                return reply(`📋 *Blocked Users*\n\n${blocked}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── SET PROFILE PICTURE ──────────────────────────────────────────────────
    {
        name: 'setpp',
        alias: ['setprofilepic', 'profilepic', 'avatar'],
        desc: 'Set your profile picture from an image',
        category: 'Owner',
        owner: true,
        usage: 'setpp <reply to image>',
        reactions: { start: '📷', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            if (!m.quoted?.mediaType?.startsWith('image')) {
                return reply(`${prefix}⊘ Reply to an image to set as profile picture`);
            }

            try {
                const buffer = await m.quoted.download();
                await sock.updateProfilePicture(buffer);
                return reply(`✓ *Profile picture updated*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── UPDATE PROFILE NAME ──────────────────────────────────────────────────
    {
        name: 'setname',
        alias: ['profilename', 'setprofile', 'myname'],
        desc: 'Update your profile name',
        category: 'Owner',
        owner: true,
        usage: 'setname <new name>',
        reactions: { start: '📝', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const newName = args.join(' ');

            if (!newName) {
                return reply(`${prefix}⊘ *Usage:* setname <new name>`);
            }

            if (newName.length > 25) {
                return reply(`${prefix}⊘ Name must be 25 characters or less`);
            }

            try {
                await sock.updateProfileName(newName);
                return reply(`✓ *Profile name updated to:* ${newName}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── GET USER STATUS ──────────────────────────────────────────────────────
    {
        name: 'getstatus',
        alias: ['userstatus', 'status', 'viewstatus'],
        desc: 'View a user\'s status message',
        category: 'Owner',
        owner: true,
        usage: 'getstatus <@user or phone>',
        reactions: { start: '📖', success: '✓', error: '❌' },

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
                const status = await sock.fetchStatus(target);
                const text = status?.status || '(no status)';
                return reply(`📖 *Status:* ${text}\n\n_Last updated: ${new Date(status?.setAt).toLocaleString()}_`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── UPDATE GROUP ICON ────────────────────────────────────────────────────
    {
        name: 'setgroupicon',
        alias: ['groupicon', 'grouppp', 'setgrouppp'],
        desc: 'Update group profile picture',
        category: 'Owner',
        owner: true,
        usage: 'setgroupicon <reply to image>',
        reactions: { start: '🖼️', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            if (!m.isGroup) {
                return reply(`${prefix}⊘ This command only works in groups`);
            }

            if (!m.quoted?.mediaType?.startsWith('image')) {
                return reply(`${prefix}⊘ Reply to an image to set as group picture`);
            }

            try {
                const buffer = await m.quoted.download();
                await sock.updateGroupPicture(m.chat, buffer);
                return reply(`✓ *Group picture updated*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── ACCEPT GROUP INVITE CODE ─────────────────────────────────────────────
    {
        name: 'joingroup',
        alias: ['join', 'acceptinvite', 'acceptcode'],
        desc: 'Join a group using an invite code',
        category: 'Owner',
        owner: true,
        usage: 'joingroup <invite code>',
        reactions: { start: '🔗', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const code = args[0];

            if (!code) {
                return reply(`${prefix}⊘ *Usage:* joingroup <invite code>`);
            }

            try {
                const result = await sock.groupAcceptInviteCode(code);
                return reply(`✓ *Joined group successfully*\n\nGroup: ${result.gid}`);
            } catch (err) {
                return reply(`${prefix}⊘ Invalid invite code or error: ${err.message}`);
            }
        }
    },

    // ── EDIT MESSAGE ─────────────────────────────────────────────────────────
    {
        name: 'editmsg',
        alias: ['edit', 'edittext', 'editmessage'],
        desc: 'Edit a previously sent message',
        category: 'Owner',
        owner: true,
        usage: 'editmsg <new text> (reply to message)',
        reactions: { start: '✏️', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            if (!m.quoted?.key) {
                return reply(`${prefix}⊘ Reply to the message you want to edit`);
            }

            const newText = args.join(' ');
            if (!newText) {
                return reply(`${prefix}⊘ *Usage:* editmsg <new text>`);
            }

            try {
                await sock.relayMessage(m.chat, 
                    { protocolMessage: { key: m.quoted.key, type: 14, editedMessage: { conversation: newText } } },
                    { messageId: m.id }
                );
                return reply(`✓ *Message edited*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── REVOKE MESSAGE (DELETE FOR EVERYONE) ─────────────────────────────────
    {
        name: 'revoke',
        alias: ['recall', 'unsend', 'deleteforeveryone'],
        desc: 'Delete a message for everyone',
        category: 'Owner',
        owner: true,
        usage: 'revoke (reply to message)',
        reactions: { start: '🔄', success: '✓', error: '❌' },

        execute: async (sock, m, { reply, prefix }) => {
            if (!m.quoted?.key) {
                return reply(`${prefix}⊘ Reply to the message you want to delete`);
            }

            try {
                await sock.sendMessage(m.chat, { delete: m.quoted.key });
                return reply(`✓ *Message deleted for everyone*`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── UPDATE ONLINE PRESENCE ───────────────────────────────────────────────
    {
        name: 'presence',
        alias: ['setonline', 'typing', 'recording'],
        desc: 'Set your online presence status',
        category: 'Owner',
        owner: true,
        usage: 'presence <available/unavailable/typing/recording/paused>',
        reactions: { start: '📡', success: '✓', error: '❌' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const status = args[0]?.toLowerCase();
            const valid = ['available', 'unavailable', 'typing', 'recording', 'paused'];

            if (!status || !valid.includes(status)) {
                return reply(`${prefix}⊘ *Usage:* presence <${valid.join('/')}>`);
            }

            try {
                await sock.sendPresenceUpdate(status, m.chat);
                return reply(`✓ *Presence updated to:* ${status}`);
            } catch (err) {
                return reply(`${prefix}⊘ Error: ${err.message}`);
            }
        }
    },

    // ── GET WHATSAPP VERSION ────────────────────────────────────────────────
    {
        name: 'waversion',
        alias: ['appversion', 'botversion', 'whatsappversion'],
        desc: 'Check WhatsApp/Bot version info',
        category: 'Owner',
        owner: true,
        usage: 'waversion',
        reactions: { start: '📊', success: '✓', error: '❌' },

        execute: async (sock, m, { reply }) => {
            try {
                const version = sock.ws?.url || 'Unknown';
                const ua = sock.store?.browserDescription || ['Unknown', 'Unknown', 'Unknown'];
                
                return reply(
                    `📊 *WhatsApp Bot Info*\n\n` +
                    `Browser: ${ua[0]} ${ua[1]}\n` +
                    `OS: ${ua[2]}\n` +
                    `Status: Connected\n\n` +
                    `_CRYSNOVA AI v2.0_`
                );
            } catch (err) {
                return reply(`ℹ *Bot Status:* Active\n_CRYSNOVA AI v2.0_`);
            }
        }
    }

];
