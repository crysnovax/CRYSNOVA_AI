console.clear();
const config = () => require('./settings/config');
process.on("uncaughtException", console.error);

let makeWASocket, Browsers, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidDecode, downloadContentFromMessage, jidNormalizedUser, isPnUser;

const loadBaileys = async () => {
  const baileys = await import('@whiskeysockets/baileys');
  
  makeWASocket = baileys.default;
  Browsers = baileys.Browsers;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  jidDecode = baileys.jidDecode;
  downloadContentFromMessage = baileys.downloadContentFromMessage;
  jidNormalizedUser = baileys.jidNormalizedUser;
  isPnUser = baileys.isPnUser;
};

const pino = require('pino');
const FileType = require('file-type');
const readline = require("readline");
const fs = require('fs');
const chalk = require("chalk");
const path = require("path");

const { Boom } = require('@hapi/boom');
const { getBuffer } = require('./library/function');
const { smsg } = require('./library/serialize');
const { videoToWebp, writeExifImg, writeExifVid, addExif, toPTT, toAudio } = require('./library/exif');
const listcolor = ['cyan', 'magenta', 'green', 'yellow', 'blue'];
const randomcolor = listcolor[Math.floor(Math.random() * listcolor.length)];

// ===== LOAD PLUGIN MANAGER =====
const pluginManager = require('./pluginManager');
pluginManager.loadAll();
console.log(chalk.cyan(`📦 Loaded ${pluginManager.list().length} plugins`));
// ===== END PLUGIN MANAGER =====

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(chalk.yellow(text), (answer) => {
            resolve(answer);
            rl.close();
        });
    });
};

const clientstart = async() => {
    await loadBaileys();
    
    const browserOptions = [
        Browsers.macOS('Safari'),
        Browsers.macOS('Chrome'),
        Browsers.windows('Firefox'),
        Browsers.ubuntu('Chrome'),
        Browsers.baileys('Baileys'),
        Browsers.macOS('Edge'),
        Browsers.windows('Edge'),
    ];
    
    const randomBrowser = browserOptions[Math.floor(Math.random() * browserOptions.length)];
    
    const store = {
        messages: new Map(),
        contacts: new Map(),
        groupMetadata: new Map(),
        loadMessage: async (jid, id) => store.messages.get(`${jid}:${id}`) || null,
        bind: (ev) => {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    if (msg.key?.remoteJid && msg.key?.id) {
                        store.messages.set(`${msg.key.remoteJid}:${msg.key.id}`, msg);
                    }
                }
            });
            
            ev.on('lid-mapping.update', ({ mappings }) => {
                console.log(chalk.cyan('📋 LID Mapping Update:'), mappings);
            });
        }
    };
    
    const { state, saveCreds } = await useMultiFileAuthState(`./${config().session}`);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !config().status.terminal,
        auth: state,
        version: version,
        browser: randomBrowser
    });
    
    if (config().status.terminal && !sock.authState.creds.registered) {
        const phoneNumber = await question('secured by crysnova enter your WhatsApp number, starting with 234:\nnumber WhatsApp: ');
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(chalk.green(`your pairing code: ` + chalk.bold.green(code)));
    }
    
    store.bind(sock.ev);

// ===== VV REACTION SYSTEM START =====
global.vvEmoji = null;
global.vvOwner = null;

sock.ev.on('messages.reaction', async (updates) => {
    try {
        if (!global.vvEmoji || !global.vvOwner) return;

        const { key, reaction } = updates[0];
        if (!reaction?.text) return;
        if (reaction.text !== global.vvEmoji) return;

        const reactor = reaction.senderId || reaction.participant;
        if (reactor !== global.vvOwner) return;

        const msg = await store.loadMessage(key.remoteJid, key.id);
        if (!msg?.message) return;

        let content = msg.message.ephemeralMessage
            ? msg.message.ephemeralMessage.message
            : msg.message;

        const type = Object.keys(content)[0];
        if (!['imageMessage','videoMessage','stickerMessage'].includes(type)) return;

        const stream = await downloadContentFromMessage(
            content[type],
            type.replace('Message','').toLowerCase()
        );

        let buffer = Buffer.alloc(0);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await sock.sendMessage(global.vvOwner, {
            [type === 'videoMessage'
                ? 'video'
                : type === 'imageMessage'
                ? 'image'
                : 'sticker']: buffer,
            caption: '📥 Private view-once unlocked'
        });

        // delete reaction after sending
        await sock.sendMessage(key.remoteJid, {
            react: { text: '', key: key }
        });

    } catch (err) {
        console.log('VV Reaction Error:', err.message);
    }
});
// ===== VV REACTION SYSTEM END =====
    const lidMapping = sock.signalRepository.lidMapping;
    
    sock.getLIDForPN = async (phoneNumber) => {
        try {
            const lid = await lidMapping.getLIDForPN(phoneNumber);
            return lid;
        } catch (error) {
            console.log('No LID found for PN:', phoneNumber);
            return null;
        }
    };
    
    sock.getPNForLID = async (lid) => {
        try {
            const pn = await lidMapping.getPNForLID(lid);
            return pn;
        } catch (error) {
            console.log('No PN found for LID:', lid);
            return null;
        }
    };
    
    sock.storeLIDPNMapping = async (lid, phoneNumber) => {
        try {
            await lidMapping.storeLIDPNMapping(lid, phoneNumber);
            console.log(chalk.green(`✓ Stored LID<->PN mapping: ${lid} <-> ${phoneNumber}`));
        } catch (error) {
            console.log('Error storing LID/PN mapping:', error);
        }
    };
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Connecting to WhatsApp...'));
        }
        
        if (connection === 'open') {
            console.log(chalk.green('✅ Connected to WhatsApp successfully!'));
            
            // Send connection success message to the bot owner
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            sock.sendMessage(botNumber, {
                text:
                    `亗 *${config().settings.title}* is Online!\n\n` +
                    `> ⚉ User: ${sock.user.name || 'Unknown'}\n` +
                    `> 乂 Prefix: [ . ]\n` +
                    `> ☬ Mode: ${sock.public ? 'Public' : 'private'}\n` +
                    `> ✪ Version: 1.0.0\n` +
                    `> 𓉤 Owner: CRYSNOVA\n\n` +
                    `✓ Bot connected successfully\n` +
                    `📢 Join our channel🚀: https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    externalAdReply: {
                        title: config().settings.title,
                        body: config().settings.description,
                        thumbnailUrl: config().thumbUrl,
                        sourceUrl: "https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38",
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }).catch(console.error);
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red('❌ Connection closed:'), lastDisconnect?.error);
            
            if (shouldReconnect) {
                console.log(chalk.yellow('🔄 Attempting to reconnect...'));
                setTimeout(clientstart, 5000);
            } else {
                console.log(chalk.red('🚫 Logged out, please restart the bot.'));
            }
        }
        
        if (qr) {
            console.log(chalk.blue('📱 Scan the QR code above to connect.'));
        }
        
        const { konek } = require('./library/connection/connection');
        konek({
            sock, 
            update, 
            clientstart, 
            DisconnectReason, 
            Boom
        });
    });

    const fs = require('fs');
const path = require('path');
const vvEmojiFile = path.join(__dirname, './plugins/vv-emoji.json');

// Ensure vv-emoji.json exists
if (!fs.existsSync(vvEmojiFile)) fs.writeFileSync(vvEmojiFile, JSON.stringify({}));

sock.ev.on('messages.upsert', async chatUpdate => {
    try {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;

        // Normalize ephemeral message
        if (Object.keys(mek.message)[0] === 'ephemeralMessage') {
            mek.message = mek.message.ephemeralMessage.message;
        }
       
        const m = await smsg(sock, mek, store);
        
        // ===== CRYSNOVA AI AUTO-REPLY =====
        const crysPlugin = pluginManager.get('crysnova') || pluginManager.get('crys');
        if (crysPlugin && crysPlugin.autoReply) {
            const handled = await crysPlugin.autoReply(sock, m);
            if (handled) return; // CRYSNOVA replied, stop processing
        }
        // ===== END CRYSNOVA =====
        
        await require('./plugins/group-guardian.js').listener(sock, m);

        // ===== Group Guardian Plugin =====
        if (!global.guardian) global.guardian = { settings: {}, warnings: {}, spam: {} };
        const guardian = global.guardian;

        // Only run in group chats
        if (m.isGroup) {
          const chatId = m.chat;
          const userId = m.sender;

          // Anti-Link
          if (guardian.settings[chatId]?.antilink) {
            if (m.text && m.text.match(/https?:\/\/|chat\.whatsapp\.com/gi)) {
              try {
                await sock.sendMessage(chatId, { delete: m.key }).catch(()=>{});

                guardian.warnings[userId] = (guardian.warnings[userId] || 0) + 1;

                await sock.sendMessage(chatId, {
                  text: `⚠ Warning ${guardian.warnings[userId]}/3 for posting links!`,
                  mentions: [userId]
                });

                if (guardian.warnings[userId] >= 3) {
                  await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
                  guardian.warnings[userId] = 0; // reset after removal
                }
              } catch (err) { console.log('Guardian Anti-Link error:', err.message); }
            }
          }

          // Anti-Spam (5 messages in 5 seconds)
          if (guardian.settings[chatId]?.antispam) {
            const now = Date.now();
            if (!guardian.spam[userId]) guardian.spam[userId] = [];

            guardian.spam[userId].push(now);
            guardian.spam[userId] = guardian.spam[userId].filter(t => now - t < 5000);

            if (guardian.spam[userId].length >= 5) {
              try {
                await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
                guardian.spam[userId] = [];
                guardian.warnings[userId] = 0; // reset warnings too
                await sock.sendMessage(chatId, { text: `❌ ${userId.split('@')[0]} removed for spamming!` });
              } catch (err) { console.log('Guardian Anti-Spam error:', err.message); }
            }
          }
        }
        
        // --- Run your plugin handler (keeps all commands working) ---
        require("./message")(sock, m, chatUpdate, store);

        // --- Premium .vv emoji reaction handler ---
        const vvEmojiData = JSON.parse(fs.readFileSync(vvEmojiFile));
        const vvEmoji = vvEmojiData[m.sender] || null;

        // Only proceed if the message is a reaction
        if (mek.message?.reactionMessage && vvEmoji) {
            const reactedEmoji = mek.message.reactionMessage.text;
            if (reactedEmoji === vvEmoji) {
                // Make sure it's a view-once type
                const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted) {
                    const type = Object.keys(quoted)[0];
                    if (['imageMessage', 'videoMessage', 'stickerMessage'].includes(type)) {
                        // Download media
                        const buffer = await sock.downloadMediaMessage(
                            { message: quoted[type] },
                            type.replace('Message','').toLowerCase()
                        );

                        // Send media to owner DM
                        await sock.sendMessage(
                            config().settings.ownerJid, 
                            { 
                                [type === 'videoMessage' ? 'video' : type === 'imageMessage' ? 'image' : 'sticker']: buffer,
                                caption: `⚡ Premium .vv from ${m.sender}`
                            }
                        );

                        // Delete reaction to keep privacy
                        await sock.sendMessage(mek.key.remoteJid, { react: { text: '✅', key: mek.key } });
                    }
                }
            }
        }

    } catch (err) {
        console.log(err);
    }
});

sock.ev.on('group-participants.update', async (data) => {
  try {
    const dbPath = './database/groupEvents.json';
    if (!fs.existsSync(dbPath)) return;

    const db = JSON.parse(fs.readFileSync(dbPath));
    if (!db[data.id] || !db[data.id].enabled) return;

    const metadata = await sock.groupMetadata(data.id);
    const memberCount = metadata.participants.length;
    const groupName = metadata.subject;

    // 🔥 USER JOINED
    if (data.action === 'add') {
      for (let user of data.participants) {
        try {
          const userId = typeof user === 'string' ? user : user.id; // ensure string
          const welcomeText = db[data.id].welcome || 'Welcome to the group!';
          const timeJoined = new Date().toLocaleString();

          // Fetch user profile picture safely
          let userPicUrl;
          try {
            userPicUrl = await sock.profilePictureUrl(userId, 'image');
          } catch {
            userPicUrl = 'https://i.imgur.com/BoN9kdC.png'; // fallback
          }

          // Construct premium theme message
          const message =
`┏━━━━〔 🚀 𝐂𝐑𝐘𝐒𝐍𝐎𝐕𝐀-𝐗ＭＤ 〕━━━━━
❏┃ Hello @${userId.split('@')[0]}!
❏┃ Welcome to *${groupName}*!
❏┃ We're thrilled to have you join us.
❏┃ Be kind, have fun, and enjoy your stay!
━━━━━━━━━━━━━━━━━━━━━

💬 ┏━━〔 👋 USER INFO 〕━━
❏┃ Name: @${userId.split('@')[0]}
❏┃ Members: ${memberCount}
❏┃ Joined: ${timeJoined}
❏┃ Message: ${welcomeText}
━━━━━━━━━━━━━━━━━━━━━`;

          await sock.sendMessage(data.id, {
            image: { url: userPicUrl },
            caption: message,
            mentions: [userId]
          });
        } catch (err) {
          console.log('User Join Error:', err.message);
        }
      }
    }

    // 🔥 USER LEFT
    if (data.action === 'remove') {
      for (let user of data.participants) {
        try {
          const userId = typeof user === 'string' ? user : user.id; // ensure string
          const goodbyeText = db[data.id].goodbye || 'Goodbye!';
          const timeLeft = new Date().toLocaleString();

          const message =
`👋 @${userId.split('@')[0]} left the group.
❏┃ Members now: ${memberCount - 1}
❏┃ Left at: ${timeLeft}
💬 ${goodbyeText}`;

          await sock.sendMessage(data.id, {
            text: message,
            mentions: [userId]
          });
        } catch (err) {
          console.log('User Leave Error:', err.message);
        }
      }
    }

  } catch (err) {
    console.log('Group Events Error:', err.message);
  }
});

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    sock.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = contact.id;
            if (store && store.contacts) {
                store.contacts.set(id, {
                    id: id,
                    lid: contact.lid || null,
                    phoneNumber: contact.phoneNumber || null,
                    name: contact.notify || contact.name || null
                });
            }
        }
    });

    sock.public = config().status.public;
    
    sock.sendText = async (jid, text, quoted = '', options) => {
        return sock.sendMessage(jid, {
            text: text,
            ...options
        }, { quoted });
    };
    
    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    sock.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ?
            await (await getBuffer(path)) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);
        
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options);
        } else {
            buffer = await addExif(buff);
        }
        
        await sock.sendMessage(jid, { 
            sticker: { url: buffer }, 
            ...options 
        }, { quoted });
        return buffer;
    };
    
    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? filename + "." + type.ext : filename;
        await fs.writeFileSync(trueFileName, buffer);
        
        return trueFileName;
    };

    sock.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ?
            await (await getBuffer(path)) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);

        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options);
        } else {
            buffer = await videoToWebp(buff);
        }

        await sock.sendMessage(jid, {
            sticker: { url: buffer }, 
            ...options 
        }, { quoted });
        return buffer;
    };
    
    sock.getFile = async (PATH, returnAsFilename) => {
        let res, filename;
        const data = Buffer.isBuffer(PATH) ?
              PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ?
              Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ?
              await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ?
              (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? 
              PATH : Buffer.alloc(0);
              
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
        
        const type = await FileType.fromBuffer(data) || {
            mime: 'application/octet-stream',
            ext: '.bin'
        };
        
        if (data && returnAsFilename && !filename) {
            filename = path.join(__dirname, './tmp/' + new Date() * 1 + '.' + type.ext);
            await fs.promises.writeFile(filename, data);
        }
        
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() {
                return filename && fs.promises.unlink(filename);
            }
        };
    };
    
    sock.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await sock.getFile(path, true);
        let { res, data: file, filename: pathFile } = type;
        
        if (res && res.status !== 200 || file.length <= 65536) {
            try {
                throw { json: JSON.parse(file.toString()) };
            } catch (e) { 
                if (e.json) throw e.json;
            }
        }
        
        let opt = { filename };
        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true;
        
        let mtype = '', mimetype = type.mime, convert;
        
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            convert = await (ptt ? toPTT : toAudio)(file, type.ext);
            file = convert.data;
            pathFile = convert.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        }
        else mtype = 'document';
        
        if (options.asDocument) mtype = 'document';
        
        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype
        };
        
        let m;
        try {
            m = await sock.sendMessage(jid, message, {
                ...opt,
                ...options
            });
        } catch (e) {
            console.error(e);
            m = null;
        } finally {
            if (!m) {
                m = await sock.sendMessage(jid, {
                    ...message,
                    [mtype]: file
                }, {
                    ...opt,
                    ...options 
                });
            }
            return m;
        }
    };
    
    return sock;
};

clientstart();
const ignoredErrors = [
    'Socket connection timeout',
    'EKEYTYPE',
    'item-not-found',
    'rate-overlimit',
    'Connection Closed',
    'Timed Out',
    'Value not found'
];

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  delete require.cache[file];
  require(file);
});

process.on('unhandledRejection', reason => {
    if (ignoredErrors.some(e => String(reason).includes(e))) return;
    console.log('Unhandled Rejection:', reason);
});

const originalConsoleError = console.error;
console.error = function (msg, ...args) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalConsoleError.apply(console, [msg, ...args]);
};

const originalStderrWrite = process.stderr.write;
process.stderr.write = function (msg, encoding, fd) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalStderrWrite.apply(process.stderr, arguments);
};
