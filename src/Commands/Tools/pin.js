module.exports = {
    name: 'pin',
    alias: ['pinmsg', 'unpin', 'pinned'],
    desc: 'Pin or unpin a message in group',
    category: 'Admin',
    groupOnly: false,
    adminOnly: false,
    usage: '.pin (reply to message) | .unpin | .pin 1d | .pin 7d | .pin 30d',
    reactions: { start: '📌', success: '📅', error: '❔' },

    execute: async (sock, m, { args, reply, prefix, quoted }) => {
        const sub = args[0]?.toLowerCase();

        // ── UNPIN ────────────────────────────────────────────────
        if (sub === 'unpin' || sub === 'remove') {
            try {
                await sock.sendMessage(m.chat, {
                    pin: m.key,
                    type: 0 // 0 = unpin
                });
                await sock.sendMessage(m.chat, { react: { text: '📌', key: m.key } });
                return reply('_*🥏 Message unpinned!*_');
            } catch (error) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply('`✘ Failed to unpin message`');
            }
        }

        // ── PIN WITH DURATION ────────────────────────────────────
        const durations = {
            '1d': 86400,      // 1 day
            '7d': 604800,     // 7 days
            '30d': 2592000,   // 30 days
            '24h': 86400,
            '1h': 3600
        };

        let time = 2592000; // Default: 30 days
        
        if (sub && durations[sub]) {
            time = durations[sub];
        }

        // ── MUST REPLY TO A MESSAGE ─────────────────────────────
        const target = quoted || m.quoted;
        if (!target) {
            await sock.sendMessage(m.chat, { react: { text: '🙊', key: m.key } });
            return reply(
                `╭─❍ *PIN MESSAGE*\n│\n` +
                `│ ⚉ *Usage:* Reply to a message with ${prefix}pin\n│\n` +
                `│ ✪ *Durations:*\n` +
                `│ • ${prefix}pin → 30 days (default)\n` +
                `│ • ${prefix}pin 1d → 1 day\n` +
                `│ • ${prefix}pin 7d → 7 days\n` +
                `│ • ${prefix}pin 30d → 30 days\n` +
                `│ • ${prefix}unpin → Remove pin\n│\n` +
                `│ 📌 *Pins message to group chat*\n` +
                `╰──────────────────`
            );
        }

        await sock.sendMessage(m.chat, { react: { text: '📌', key: m.key } });

        try {
            await sock.sendMessage(m.chat, {
                pin: target.key || target.key,
                time: time,
                type: 1 // 1 = pin
            });

            // Format duration for response
            let durationText = '30 days';
            if (time === 86400) durationText = '1 day';
            else if (time === 604800) durationText = '7 days';
            else if (time === 3600) durationText = '1 hour';

            await sock.sendMessage(m.chat, { react: { text: '📅', key: m.key } });
            await reply(
                `╭─❍ *MESSAGE PINNED*\n│\n` +
                `│ ⇆ *Status:* Pinned\n` +
                `│ —͟͟͞͞𖣘 *Duration:* ${durationText}\n│\n` +
                `│ 𝓬𝓻𝔂𝓼𝓷𝓸𝓿𝓪 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭\n` +
                `╰──────────────────`
            );

        } catch (error) {
            console.error('[PIN ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to pin message. Make sure bot is admin.`');
        }
    }
};
