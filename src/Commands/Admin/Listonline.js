module.exports = {
    name: 'listonline',
    alias: [ 'active', 'here', 'listact', 'onlinelist', 'whoisonline'],
    desc: 'List all online/active users in the group',
    category: 'group',
    usage: '.listonline',
    react: '👥',

    execute: async (sock, m, { reply, isGroup, sender }) => {

        if (!isGroup) {
            return reply('✘ _*This command only works in groups!*_');
        }

        try {
            await sock.sendPresenceUpdate("composing", m.chat);

            // Get group metadata
            const metadata = await sock.groupMetadata(m.chat);
            const participants = metadata.participants || [];

            if (!participants.length) {
                return reply('✘ _*No participants found!*_');
            }

            // CRITICAL: Subscribe to presence updates for this group
            try {
                await sock.presenceSubscribe(m.chat);
            } catch (e) {
                console.log('[ListOnline] Presence subscribe failed:', e.message);
            }

            // Wait longer for presence updates to populate (WhatsApp needs time)
            await new Promise(resolve => setTimeout(resolve, 3000));

            const onlineUsers = [];
            const offlineUsers = [];
            const unknownUsers = [];

            for (const participant of participants) {
                const jid = participant.id;
                const number = jid.split('@')[0];

                // MULTI-SOURCE CHECK FOR ONLINE STATUS
                
                let isOnline = false;
                let presenceSource = 'none';
                let lastSeen = 'unknown';

                // Source 1: Global onlineUsers Set (from presence.update events)
                if (global.onlineUsers && global.onlineUsers.has(jid)) {
                    isOnline = true;
                    presenceSource = 'global';
                }

                // Source 2: Store.presences (your custom store in main.js)
                try {
                    const storePresence = sock.store?.presences?.[jid];
                    if (storePresence) {
                        const status = storePresence.lastKnownPresence;
                        if (['available', 'composing', 'recording'].includes(status)) {
                            isOnline = true;
                            presenceSource = 'store';
                            lastSeen = status;
                        } else if (status === 'unavailable' && storePresence.lastSeen) {
                            lastSeen = new Date(storePresence.lastSeen).toLocaleTimeString();
                        }
                    }
                } catch {}

                // Source 3: Direct sock.presences (Baileys native)
                try {
                    const directPresence = sock.presences?.[jid];
                    if (directPresence) {
                        const status = directPresence.lastKnownPresence;
                        if (['available', 'composing', 'recording'].includes(status)) {
                            isOnline = true;
                            presenceSource = 'direct';
                            lastSeen = status;
                        }
                    }
                } catch {}

                // Source 4: Check if user is currently typing/composing in this chat
                try {
                    const chatPresences = sock.presences?.[m.chat];
                    if (chatPresences && chatPresences[jid]) {
                        const status = chatPresences[jid];
                        if (['available', 'composing', 'recording'].includes(status)) {
                            isOnline = true;
                            presenceSource = 'chat';
                            lastSeen = status;
                        }
                    }
                } catch {}

                // Get name from store.contacts (Map)
                let displayName = number;
                try {
                    const contact = sock.store?.contacts?.get?.(jid);
                    if (contact) {
                        if (contact.notify?.trim()) displayName = contact.notify;
                        else if (contact.name?.trim()) displayName = contact.name;
                        else if (contact.verifiedName?.trim()) displayName = contact.verifiedName;
                    }
                    
                    // Fallback
                    if (displayName === number) {
                        const fetched = await sock.getName(jid);
                        if (fetched && fetched !== jid) displayName = fetched;
                    }
                } catch {}

                const userInfo = {
                    jid,
                    number,
                    name: displayName,
                    isAdmin: participant.admin === 'admin' || participant.admin === 'superadmin',
                    isOnline,
                    presenceSource,
                    lastSeen
                };

                // Categorize
                if (isOnline) {
                    onlineUsers.push(userInfo);
                } else if (presenceSource !== 'none') {
                    offlineUsers.push(userInfo);
                } else {
                    unknownUsers.push(userInfo);
                }
            }

            // Sort: Admins first, then by name
            onlineUsers.sort((a, b) => (b.isAdmin - a.isAdmin) || a.name.localeCompare(b.name));

            // Build response
            const mentions = onlineUsers.map(u => u.jid);
            
            let response = `╭─❍ *ONLINE MONITOR* 👥\n`;
            response += `│ Group: ${metadata.subject}\n`;
            response += `│ Total: ${participants.length} members\n`;
            response += `│ ✦ Online: ${onlineUsers.length}\n`;
            response += `│ ○ Offline: ${offlineUsers.length}\n`;
            response += `│ ? Unknown: ${unknownUsers.length}\n`;
            response += `╰─\n\n`;

            if (onlineUsers.length > 0) {
                response += `*✦ ONLINE NOW (${onlineUsers.length})*\n`;
                response += `*━━━━━━━━━━━━━━━━━━━━━*\n`;

                onlineUsers.forEach((user, i) => {
                    const badge = user.isAdmin ? '💫' : '●';
                    const status = user.lastSeen === 'composing' ? '✏️ typing...' :
                                  user.lastSeen === 'recording' ? '🎙️ recording...' : '● online';
                    
                    response += `${i + 1}. ${badge} @${user.number}\n`;
                    response += `   └ ${status} *${user.name}*\n`;
                });
                response += `\n`;
            } else {
                response += `*✦ ONLINE (0)*\n`;
                response += `╰─ _No users detected online_\n`;
                response += `_Note: WhatsApp only shares presence with contacts or recent chats_\n\n`;
            }

            // Show some offline users
            if (offlineUsers.length > 0 && onlineUsers.length < 5) {
                const sample = offlineUsers.slice(0, 3);
                response += `*○ RECENTLY OFFLINE*\n`;
                sample.forEach((user, i) => {
                    const badge = user.isAdmin ? '💫' : '○';
                    response += `${i + 1}. ${badge} ${user.name}\n`;
                });
                if (offlineUsers.length > 3) {
                    response += `_...and ${offlineUsers.length - 3} more_\n`;
                }
                response += `\n`;
            }

            // Show unknown status users
            if (unknownUsers.length > 0 && onlineUsers.length === 0) {
                response += `*? PRIVACY RESTRICTED*\n`;
                response += `_${unknownUsers.length} users hide their presence_\n`;
                response += `_Try adding them as contacts for better tracking_\n`;
            }

            await sock.sendMessage(m.chat, {
                text: response,
                mentions: mentions
            }, { quoted: m });

            await sock.sendPresenceUpdate("paused", m.chat);

        } catch (err) {
            console.error('[LISTONLINE ERROR]', err);
            reply('✘ _*Error: ' + err.message + '*_');
        }
    }
};
