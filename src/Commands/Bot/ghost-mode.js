const fs = require('fs');
const path = require('path');

// Storage (per-user or global toggle)
const GHOST_FILE = path.join(__dirname, '../../../database/ghost-mode.json');

let ghostEnabled = false;        // global toggle
let ghostChats = new Set();      // per-chat JIDs (if you want per-chat later)

try {
    if (fs.existsSync(GHOST_FILE)) {
        const data = JSON.parse(fs.readFileSync(GHOST_FILE, 'utf8'));
        ghostEnabled = data.global || false;
        if (data.chats) ghostChats = new Set(data.chats);
    }
} catch (e) {
    console.error('[GHOST MODE] Load error:', e.message);
}

function saveGhost() {
    try {
        fs.writeFileSync(GHOST_FILE, JSON.stringify({
            global: ghostEnabled,
            chats: Array.from(ghostChats)
        }, null, 2));
    } catch (e) {}
}

module.exports = {
    name: 'ghost',
    alias: ['ghostmode', 'invisible', 'stealth'],
    desc: 'Appear offline to everyone while staying fully active',
    category: 'owner',
    usage: '.ghost on   |   .ghost off   |   .ghost status',
    owner: true,

    execute: async (sock, m, { args, reply }) => {
        const sub = args[0]?.toLowerCase();

        if (!sub || sub === 'status') {
            const status = ghostEnabled ? '🟢 ON (offline to others)' : '🔴 OFF (normal presence)';
            return reply(
                `👻 *Ghost Mode Status*\n\n` +
                `Current: **${status}**\n\n` +
                `Toggle:\n` +
                `• .ghost on   → appear offline while active\n` +
                `• .ghost off  → back to normal`
            );
        }

        if (sub === 'on') {
            if (ghostEnabled) return reply('👻 Ghost mode already active');

            ghostEnabled = true;
            saveGhost();

            // Force offline presence immediately
            await sock.sendPresenceUpdate('unavailable');

            // Keep forcing unavailable every 30 seconds (WhatsApp resets presence)
            const interval = setInterval(async () => {
                if (!ghostEnabled) {
                    clearInterval(interval);
                    return;
                }
                try {
                    await sock.sendPresenceUpdate('unavailable');
                } catch {}
            }, 30000);

            return reply(
                '👻 **Ghost Mode ACTIVATED**\n\n' +
                '• You now appear **offline** to everyone\n' +
                '• Bot still reads/replies normally\n' +
                '• Turn off with: .ghost off\n\n' +
                'Stay hidden 😈'
            );
        }

        if (sub === 'off') {
            if (!ghostEnabled) return reply('👻 Ghost mode already off');

            ghostEnabled = false;
            saveGhost();

            // Restore normal presence
            await sock.sendPresenceUpdate('available');

            return reply(
                '🔴 **Ghost Mode DEACTIVATED**\n\n' +
                '• Normal online status restored\n' +
                '• Everyone can see when you\'re active again'
            );
        }

        reply('⚉ Invalid. Use .ghost on | off | status');
    }
};

// ── Force ghost presence in messages.upsert (add to index.js) ──────
module.exports.forceGhostPresence = async (sock) => {
    if (ghostEnabled) {
        try {
            await sock.sendPresenceUpdate('unavailable');
        } catch {}
    }
};