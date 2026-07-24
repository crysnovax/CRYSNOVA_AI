// ── BAILEYS SOCKET METHODS AS COMMANDS ──────────────────────────────────────
module.exports = [

    // ── GET USER STATUS ──────────────────────────────────────────────────────
    {
        name: 'getstatus',
        alias: ['userstatus', 'statuscheck', 'viewstatus'],
        desc: 'Get a user\'s status message',
        category: 'Owner',
        owner: true,
        usage: `${prefix}getstatus <@user or phone>`,
        reactions: { start: '🫆', success: '🍃', error: '🚧' },

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
                return reply(`⊘ *Usage:* ${prefix}getstatus <@user or phone>`);
            }

            try {
                // fetchStatus is variadic and always returns a list, even for one target.
                // Confirmed shape: statusList[0].status = { status, setAt } — status is
                // null (setAt sits at epoch) when there's nothing to show, either because
                // no About text is set, or privacy settings hide it from this bot.
                const statusList = await sock.fetchStatus(target);
                const info = statusList?.[0]?.status;

                if (!info?.status) {
                    return reply(`@${target.split('@')[0]}\n\nNo status set`);
                }

                return reply(
                    `@${target.split('@')[0]}\n\n` +
                    `${info.status}`
                );
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
            }
        }
    },

    // ── SET GROUP ICON (HD Flag) ─────────────────────────────────────────────
    {
        name: 'setgroupicon',
        alias: ['setgrouppp', 'setgppicon', 'groupicon', 'setgpphd'],
        desc: 'Set group profile picture with HD full-size upload',
        category: 'Owner',
        owner: true,
        usage: `${prefix}setgroupicon (reply to image)`,
        reactions: { start: '🖼️', success: '🍃', error: '🚧' },

        execute: async (sock, m, { reply }) => {
            if (!m.isGroup) {
                return reply(`⊘ *Usage:* Only works in groups`);
            }

            if (!m.quoted?.mimetype?.startsWith('image/')) {
                return reply(`⊘ *Usage:* Reply to an image`);
            }

            try {
                const image = await m.quoted.download();
                // Fork's HD/no-crop feature table confirms the flag is { hd: true }, not { quality: 'full' }.
                // Method name updateProfilePicture is inferred (matches upstream, handles both user + group JIDs) —
                // not directly confirmed in the docs I've read, worth a runtime check.
                await sock.updateProfilePicture(m.chat, image, { hd: true });
                return reply(`✓ *Group icon updated (HD)*`);
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
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
        usage: `${prefix}joingroup <invite_code>`,
        reactions: { start: '🔗', success: '🍃', error: '🚧' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const code = args[0];

            if (!code) {
                return reply(`⊘ *Usage:* ${prefix}joingroup <invite_code>`);
            }

            try {
                const result = await sock.groupAcceptInviteCode(code);
                return reply(`✓ *Joined group:* ${result}`);
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
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
        usage: `${prefix}editmsg <new_text> (reply to message)`,
        reactions: { start: '✏️', success: '🍃', error: '🚧' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const newText = args.join(' ');

            if (!newText) {
                return reply(`⊘ *Usage:* ${prefix}editmsg <new_text>`);
            }

            if (!m.quoted?.key) {
                return reply(`⊘ *Usage:* Reply to a message to edit it`);
            }

            try {
                // Confirmed in the docs — editing goes through sendMessage + an `edit` key,
                // there's no standalone editMessage method.
                await sock.sendMessage(m.chat, { text: newText, edit: m.quoted.key });
                return reply(`✓ *Message edited*`);
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
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
        usage: `${prefix}waversion`,
        reactions: { start: '🫆', success: '🫆', error: '🚧' },

        execute: async (sock, m, { reply }) => {
            try {
                // UNVERIFIED — sock.getWAVersionInfo doesn't appear in the docs sections I've read,
                // and in mainline Baileys, version info comes from fetchLatestBaileysVersion(),
                // a standalone import called *before* makeWASocket(), not a method on a live sock.
                // The ?. means it won't throw, but it likely just always falls back to 'Unknown'.
                // Left as-is — no confirmed replacement yet, run the console.log(Object.keys(sock))
                // check from earlier to find the real name if one exists on this fork.
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
                return reply(`⊘ Error: ${err.message}`);
            }
        }
    },

    // ── CREATE NEWSLETTER ────────────────────────────────────────────────────
    {
        name: 'createnewsletter',
        alias: ['mkchannels', 'createchannel', 'newabc'],
        desc: 'Create a new newsletter/channel',
        category: 'Owner',
        owner: true,
        usage: `${prefix}createnewsletter <channel_name>`,
        reactions: { start: '📰', success: '🍃', error: '🚧' },

        execute: async (sock, m, { args, reply, prefix }) => {
            const name = args.join(' ');

            if (!name) {
                return reply(`⊘ *Usage:* ${prefix}createnewsletter <name>`);
            }

            try {
                const channel = await sock.newsletterCreate(name);
                return reply(
                    `✓ *Newsletter created*\n\n` +
                    `ID: ${channel.id}\n` +
                    `Name: ${name}`
                );
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
            }
        }
    },

    // ── LEAVE NEWSLETTER ────────────────────────────────────────────────────
    {
        name: 'leavesubscription',
        alias: ['leavenewsletter', 'leavechannel', 'unsubnews'],
        desc: 'Leave a newsletter/channel subscription',
        category: 'Owner',
        owner: true,
        usage: `${prefix}leavesubscription (reply in newsletter)`,
        reactions: { start: '🚪', success: '🍃', error: '🚧' },

        execute: async (sock, m, { reply }) => {
            if (!m.chat.endsWith('@newsletter')) {
                return reply(`⊘ *Usage:* Use this command in a newsletter`);
            }

            try {
                await sock.newsletterLeave(m.chat);
                return reply(`✓ *Left the newsletter*`);
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
            }
        }
    },

    // ── UPDATE NEWSLETTER SETTINGS ───────────────────────────────────────────
    {
        name: 'updatechannel',
        alias: ['updatenewsletter', 'editchannel', 'channelsettings'],
        desc: 'Update newsletter/channel settings',
        category: 'Owner',
        owner: true,
        usage: `${prefix}updatechannel <setting> <value>`,
        reactions: { start: '⚙️', success: '🍃', error: '🚧' },

        execute: async (sock, m, { args, reply, prefix }) => {
            if (!m.chat.endsWith('@newsletter')) {
                return reply(`⊘ *Usage:* Use this command in a newsletter`);
            }

            const setting = args[0]?.toLowerCase();
            const value = args.slice(1).join(' ');

            if (!setting || !value) {
                return reply(
                    `⊘ *Usage:* ${prefix}updatechannel <setting> <value>\n\n` +
                    `Settings:\n` +
                    `• name - Change channel name\n` +
                    `• description - Update description`
                );
            }

            try {
                // UNVERIFIED — kept as one newsletterUpdateSettings(jid, {name, description}) call.
                // Suspect this fork may split it into newsletterUpdateName(jid, value) and
                // newsletterUpdateDescription(jid, value) instead, but nothing in the docs
                // I've read confirms either shape. Check before relying on it.
                const updates = {};
                if (setting === 'name') updates.name = value;
                if (setting === 'description') updates.description = value;

                await sock.newsletterUpdateSettings(m.chat, updates);
                return reply(`✓ *${setting} updated*`);
            } catch (err) {
                return reply(`⊘ Error: ${err.message}`);
            }
        }
    }

];
