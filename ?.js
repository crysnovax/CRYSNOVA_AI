/**
 * ╔══════════════════════════════════════════════════╗
 * ║   - ZEE BOT V2          ║
 * ║   CRYSNOVA AI V2 Message Routing Engine          ║
 * ╚══════════════════════════════════════════════════╝
 */

const chalk = require('chalk');
const { setupStatusHandler } = require('./src/Plugin/statusHandler');
const { getVar }             = require('./src/Plugin/configManager');

// BOTFONT IMPORTS
const styles  = require("./src/Commands/Core/'.js");
const botFont = require('./src/Commands/Bot/botfont.js');

const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

module.exports = function setupMessageHandler(sock, customStore, handleMessage, smsg, io, config) {

    // BOTFONT OVERRIDE (GLOBAL)
    const originalSend = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
        try {
            if (content?.text) {
                const font = botFont.getFont(jid);
                if (font && styles[font]) {
                    content.text = styles[font](content.text);
                }
            }
        } catch {}
        return originalSend(jid, content, options);
    };

    // Auto Status View + Like
    setupStatusHandler(sock);

    // Anti Call — reject incoming calls if enabled
    sock.ev.on('call', async (calls) => {
        try {
            const { getVar } = require('./src/Plugin/configManager');
            if (!getVar('ANTI_CALL', true)) return;

            for (const call of calls) {
                if (call.status !== 'offer') continue;
                await sock.rejectCall(call.id, call.from).catch(() => {});
                console.log(`[ANTICALL] Rejected call from ${call.from}`);
            }
        } catch {}
    });

    // VV Reaction Listener — must start at boot with store access
    try {
        const vv = require('./src/Commands/Converter/view-once.js');
        if (vv?.setup) vv.setup(sock, customStore);
    } catch {}

    // Restore mute schedules after sock is ready
    try {
        const muteCmd = require('./src/Commands/Admin/Mute.js');
        if (muteCmd?.setupMuteSchedules) muteCmd.setupMuteSchedules(sock);
    } catch {}

    // Presence tracking for listonline
    sock.ev.on('presence.update', ({ id, presences }) => {
        if (!global.onlineUsers) global.onlineUsers = new Set();
        for (const [jid, presence] of Object.entries(presences)) {
            if (['available', 'composing', 'recording'].includes(presence.lastKnownPresence)) {
                global.onlineUsers.add(jid);
            } else {
                global.onlineUsers.delete(jid);
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek || !mek.message) return;

            if (mek.key?.remoteJid === 'status@broadcast') return;

            if (mek.message.ephemeralMessage) {
                mek.message = mek.message.ephemeralMessage.message;
            }

            const m = await smsg(sock, mek, customStore);
            if (!m) return;

            if (mek.key?.remoteJid && mek.key?.id) {
                customStore.messages.set(mek.key.remoteJid + ':' + mek.key.id, mek);
            }

            // Cache message for antidelete
            try {
                const antidelete = require('./src/Commands/Tools/antidelete.js');
                if (antidelete?.cacheMessage) antidelete.cacheMessage(mek);
            } catch {}

            global.crysStats.messages++;

            io.emit('new-message', {
                from: m.sender,
                chat: m.chat,
                text: m.text || '[Media]',
                isGroup: m.isGroup,
                time: Date.now()
            });

            // Invisible Tag (@everyone)
            if (m.text && m.text.startsWith('\u200E\u200E\u200E\u200E\u200E') && m.isGroup) {
                try {
                    const metadata     = await sock.groupMetadata(m.chat);
                    const participants = metadata.participants.map(p => p.id);
                    if (participants.length) {
                        await sock.sendMessage(m.chat, {
                            text: m.text.slice(2) || '\u200E',
                            mentions: participants
                        }, { quoted: m });
                    }
                } catch {}
                return;
            }

            // Mute User Check
            try {
                const mutePlugin = require('./src/Commands/Group/muteuser.js');
                if (mutePlugin?.handleMutedMessage) {
                    const wasDeleted = await mutePlugin.handleMutedMessage(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            // Mute Sticker Check
            try {
                const mutesticker = require('./src/Commands/Group/mutesticker.js');
                if (mutesticker?.handleMutedSticker) {
                    const wasDeleted = await mutesticker.handleMutedSticker(sock, m, m.isGroup);
                    if (wasDeleted) return;
                }
            } catch {}

            // Fake Typing — only when a command is being processed
            const bodyCheck   = (mek.message?.conversation || mek.message?.extendedTextMessage?.text || '').trim();
            const prefixCheck = getVar('PREFIX', '.');
            const isCommand   = bodyCheck.startsWith(prefixCheck);

            try {
                if (isCommand && getVar('FAKE_TYPING') !== false) {
                    await sock.sendPresenceUpdate('composing', m.key.remoteJid);
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   ANTI TAG
            // ─────────────────────────────────────────────────────────────
            try {
                const antitag = require('./src/Commands/Admin/antitag.js');
                if (antitag?.handleAntiTag) await antitag.handleAntiTag(sock, m);
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   STICKER COMMAND HANDLER
            // ─────────────────────────────────────────────────────────────
            try {
                if (m.mtype === 'stickerMessage') {
                    const { stickerCmds } = require('./src/Commands/Owner/setcmd.js');
                    const stickerData = m.message?.stickerMessage;
                    const fileSha256  = stickerData?.fileSha256;
                    if (fileSha256) {
                        const hash = Buffer.isBuffer(fileSha256)
                            ? fileSha256.toString('hex')
                            : String(fileSha256);
                        if (hash && stickerCmds[hash]) {
                            const boundCmd = stickerCmds[hash];
                            console.log(`[STICKER CMD] ${m.sender.split('@')[0]} -> ${boundCmd}`);
                            m.body = `.${boundCmd}`;
                            m.text = `.${boundCmd}`;
                        }
                    }
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   OWNER MENTION HANDLER (FIXED FOR LID)
            // ─────────────────────────────────────────────────────────────
            try {
                const { mentionConfig } = require('./src/Commands/Owner/mention.js');

                if (mentionConfig.active) {
                    // Get owner info
                    const config = require('./settings/config');
                    const ownerNumber = (process.env.OWNER_NUMBER || config.owner || '').replace(/[^0-9]/g, '');
                    
                    if (!ownerNumber) {
                  //      console.log('[MENTION] No owner number configured');
                    } else {
                        
                        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
                        
                        // Get bot's identifiers from sock.user
                        const botPnJid = (sock.user?.id || '').replace(/:\d+@/, '@s.whatsapp.net');
                        const botLid = sock.user?.lid || ''; // LID format: 123456789:1@lid
                        
                 //       console.log(`[MENTION DEBUG] ownerJid=${ownerJid}, botPnJid=${botPnJid}, botLid=${botLid}`);

                        // Helper: normalize JID (remove :XX suffix from LIDs)
                        const norm = (j) => (j || '').replace(/:\d+@/, '@').toLowerCase().trim();
                        
                        // ─── 1. COLLECT ALL MENTIONS ───
                        const rawMsg = mek.message || {};
                        const ctxInfo = rawMsg.extendedTextMessage?.contextInfo || 
                                       rawMsg.imageMessage?.contextInfo ||
                                       rawMsg.videoMessage?.contextInfo || 
                                       rawMsg.documentMessage?.contextInfo || {};
                        
                        const allMentions = [
                            ...(ctxInfo.mentionedJid || []),
                            ...(m.mentionedJid || []),
                            ...(m.msg?.contextInfo?.mentionedJid || []),
                        ];
                        
                        const uniqueMentions = [...new Set(allMentions)].filter(Boolean);
                       // console.log(`[MENTION] Raw mentions:`, uniqueMentions);

                        // ─── 2. CHECK IF OWNER IS MENTIONED ───
                        let isMentioned = false;
                        
                        for (const jid of uniqueMentions) {
                            const normalized = norm(jid);
                            const isLidFormat = jid.includes('@lid');
                            
                        //    console.log(`[MENTION] Checking: ${jid} (norm: ${normalized}, isLid: ${isLidFormat})`);
                            
                            // Check 1: Direct phone JID match
                            if (normalized === norm(ownerJid) || normalized === norm(botPnJid)) {
                                isMentioned = true;
                         //       console.log(`[MENTION] ✓ Match: Phone JID`);
                                break;
                            }
                            
                            // Check 2: LID direct match (if botLid is available)
                            if (botLid && normalized === norm(botLid)) {
                                isMentioned = true;
                     //           console.log(`[MENTION] ✓ Match: LID direct`);
                                break;
                            }
                            
                            // Check 3: Use decodeJid to convert LID to PN
                            try {
                                const decoded = sock.decodeJid(jid);
                    //            console.log(`[MENTION] decodeJid(${jid}) = ${decoded}`);
                                if (decoded && norm(decoded) === norm(ownerJid)) {
                                    isMentioned = true;
                       //             console.log(`[MENTION] ✓ Match: decodeJid converted LID to PN`);
                                    break;
                                }
                            } catch (e) {
                //                console.log(`[MENTION] decodeJid failed for ${jid}:`, e.message);
                            }
                            
                            // Check 4: participantAlt (the phone number for a LID)
                            const participantAlt = ctxInfo.participantAlt || m.msg?.contextInfo?.participantAlt;
                            if (participantAlt) {
                    //            console.log(`[MENTION] participantAlt: ${participantAlt}`);
                                if (norm(participantAlt) === norm(ownerJid)) {
                                    isMentioned = true;
                 //                   console.log(`[MENTION] ✓ Match: participantAlt`);
                                    break;
                                }
                            }
                        }

                        // ─── 3. CHECK REPLY TO OWNER ───
                      //  let isReplyToOwner = false;
                      //  const quotedParticipant = ctxInfo.participant;
                       // if (quotedParticipant) {
             //               console.log(`[MENTION] Quoted participant: ${quotedParticipant}`);
                           // if (norm(quotedParticipant) === norm(ownerJid) || 
                          //      norm(quotedParticipant) === norm(botPnJid) ||
                             //   (botLid && norm(quotedParticipant) === norm(botLid))) {
                         //       isReplyToOwner = true;
             //                   console.log(`[MENTION] ✓ Reply to owner detected`);
                          //  }
                  //      }

                        // ─── 4. CHECK TEXT CONTENT ───
                        const allText = [
                            rawMsg.conversation,
                            rawMsg.extendedTextMessage?.text,
                            rawMsg.imageMessage?.caption,
                            rawMsg.videoMessage?.caption,
                            m.text,
                            m.body
                        ].filter(Boolean).join(' ');
                        
                        const textHasOwner = allText.includes(ownerNumber) || 
                                            allText.includes(`@${ownerNumber}`) ||
                                            allText.includes(ownerJid);

                   //     console.log(`[MENTION FINAL] isMentioned=${isMentioned}, isReplyToOwner=${isReplyToOwner}, textHasOwner=${textHasOwner}`);

                        // ─── 5. EXECUTE ───
                        if (isMentioned || isReplyToOwner || textHasOwner) {
           //                 console.log(`[MENTION] >>> OWNER MENTIONED! Action: ${mentionConfig.action}`);
                            
                            if (mentionConfig.action === 'react' && mentionConfig.emoji) {
                                await sock.sendMessage(m.chat, {
                                    react: { text: mentionConfig.emoji, key: m.key }
                                }).catch(e => console.log('[MENTION REACT ERR]', e.message));
                                
                            } else if (mentionConfig.action === 'text' && mentionConfig.text) {
                                await sock.sendMessage(m.chat, {
                                    text: mentionConfig.text
                                }, { quoted: m }).catch(e => console.log('[MENTION TEXT ERR]', e.message));
                            }
                        }
                    }
                }
            } catch (e) {
        //        console.error('[MENTION HANDLER ERROR]', e.message, e.stack);
            }

            // ─────────────────────────────────────────────────────────────
            //                   MAIN COMMAND ENGINE
            // ─────────────────────────────────────────────────────────────
            await handleMessage(sock, m, customStore);

            // ─────────────────────────────────────────────────────────────
            //                   CRYSNOVA AI AUTO-REPLY
            // ─────────────────────────────────────────────────────────────
            try {
                const crysnova = require('./src/Commands/AI/crysnova.js');
                const msgText  = (m.text || '').toLowerCase().trim();

                if (
                    msgText.startsWith('.crysnova') ||
                    msgText.startsWith('.ai') ||
                    msgText.startsWith('.crys')
                ) {
                    // handled above by handleMessage
                } else if (crysnova?.onMessage) {
                    await crysnova.onMessage(sock, m);
                }
            } catch {}

            // ─────────────────────────────────────────────────────────────
            //                   OTHER FEATURES
            // ─────────────────────────────────────────────────────────────

            // Anti Group Mention
            try {
                const antigm = require('./src/Commands/Admin/antigm.js');
                if (antigm?.handleAntiGM) await antigm.handleAntiGM(sock, m);
            } catch {}

            // VV Reply Trigger
            try {
                const vvcmd = require('./src/Commands/Converter/vvcmd.js');
                if (vvcmd?.handleVVReply) await vvcmd.handleVVReply(sock, m);
            } catch {}

            // Anti-Link
            try {
                const anti = require('./src/Plugin/antilink.js');
                if (anti?.handleAntiLink) await anti.handleAntiLink(sock, m);
            } catch {}

            // Auto React on Tag
            try {
                if (m.isGroup && m.mentionedJid?.length) {
                    const botJid = (sock.user?.id || '').replace(/:\d+@/, '@');
                    const tagged = m.mentionedJid.some(j => j.replace(/:\d+@/, '@') === botJid);
                    if (tagged) {
                        const emoji = getVar('TAG_REACT_EMOJI') || process.env.TAG_REACT_EMOJI || '';
                        if (emoji) {
                            await sock.sendMessage(m.chat, {
                                react: { text: emoji, key: m.key }
                            }).catch(() => {});
                        }
                    }
                }
            } catch {}

        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log(chalk.red('[MSG ERROR]'), err.message);
            }
        }
    });

    // AntiDelete + messages.update
    sock.ev.on('messages.update', async (updates) => {

        // Anti-Delete
        try {
            const antidelete = require('./src/Commands/Tools/antidelete.js');
            if (antidelete?.onDelete) await antidelete.onDelete(sock, updates, customStore);
        } catch {}

        // quoted.js lives in library/
        try {
            const quoted = require('./library/quoted.js');
            if (quoted?.onDelete) await quoted.onDelete(sock, updates, customStore);
        } catch {}
    });
};

// Auto-clean quoted temp store
setInterval(() => {
    try {
        const quoted = require('./library/quoted.js');
        if (quoted?.cleanUp) quoted.cleanUp();
    } catch {}
}, 60000);
                        
