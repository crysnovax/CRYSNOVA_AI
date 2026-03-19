/** © BY CRYSNOVA 2026 - WEB PAIRING VERSION
 * ╔══════════════════════════════════════════════════╗
 * ║         CRYSNOVA AI V2.0 - Professional         ║
 * ║   🌐 WEB-BASED PAIRING - NO ENV VARS NEEDED!    ║
 * ╚══════════════════════════════════════════════════╝
 */

console.clear();

// ── Core ───────────────────────────────────────────
const express  = require('express');
const http     = require('http');
const socketIo = require('socket.io');
const path     = require('path');
const pino     = require('pino');
const fs       = require('fs');
const chalk    = require('chalk');
const { Boom } = require('@hapi/boom');

// ── Baileys (Elaina fork) ──────────────────────────
let elainaBaileys, Browsers, useMultiFileAuthState,
    DisconnectReason, fetchLatestBaileysVersion,
    jidDecode, downloadContentFromMessage,
    jidNormalizedUser, makeInMemoryStore;

const loadBaileys = async () => {
    const baileys = await import('@rexxhayanasi/elaina-baileys');
    elainaBaileys             = baileys.default;
    Browsers                  = baileys.Browsers;
    useMultiFileAuthState     = baileys.useMultiFileAuthState;
    DisconnectReason          = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    jidDecode                 = baileys.jidDecode;
    downloadContentFromMessage= baileys.downloadContentFromMessage;
    jidNormalizedUser         = baileys.jidNormalizedUser;
    makeInMemoryStore         = baileys.makeInMemoryStore;
};

// ── CRYSNOVA Modules ───────────────────────────────
const config       = () => require('./settings/config');
const { smsg }     = require('./library/serialize');
const { getBuffer }= require('./library/function');
const FileType     = require('file-type');

// ── Kord-Style Modules ─────────────────────────────
const { loadCommands }   = require('./src/Plugin/crysLoadCmd');
const { handleMessage }  = require('./src/Plugin/crysMsg');
const { crysStatistic }  = require('./src/Plugin/crysStatistic');

// ── MESSAGE HANDLER ────────────────────────────────
const setupMessageHandler = require('./_-.js');

// ── Express + Socket.IO ────────────────────────────
const app    = express();
const port   = process.env.PORT || 3000;
const server = http.createServer(app);
const io     = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'Public/index.html')));

// ── Global Stats ───────────────────────────────────
global.crysStats = {
    messages: 0,
    commands: 0,
    startTime: Date.now(),
    uptime: 0,
    connected: false,
    number: null
};

// ── Global AFK Map ─────────────────────────────────
if (!global.afk) global.afk = new Map();

// ── Global Online Users ────────────────────────────
global.onlineUsers = global.onlineUsers || new Set();

// ── Global Pairing State ───────────────────────────
global.pairingState = {
    inProgress: false,
    code: null,
    phoneNumber: null,
    sock: null
};

// ── Ignored Errors ─────────────────────────────────
const ignoredErrors = [
    'Socket connection timeout', 'EKEYTYPE', 'item-not-found',
    'rate-overlimit', 'Connection Closed', 'Timed Out', 'Value not found',
    'Bad MAC', 'decrypt error', 'Socket closed', 'Session closed',
    'Connection terminated', 'read ECONNRESET', 'write ECONNRESET',
    'ECONNREFUSED', 'connect ETIMEDOUT', 'network timeout'
];

// ═══════════════════════════════════════════════════
// 🌐 WEB PAIRING API ENDPOINTS
// ═══════════════════════════════════════════════════

// API: Request Pairing Code
app.post('/api/request-pairing', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone || phone.length < 10) {
            return res.json({ success: false, message: 'Invalid phone number' });
        }

        const cleanNumber = phone.replace(/[^0-9]/g, '');
        
        console.log(chalk.cyan('[WEB PAIRING] Request from:', cleanNumber));
        
        // Check if already pairing
        if (global.pairingState.inProgress) {
            return res.json({ 
                success: false, 
                message: 'Pairing already in progress. Please wait.' 
            });
        }

        // Check if already connected
        if (global.crysStats.connected) {
            return res.json({ 
                success: false, 
                message: 'Bot is already connected! Disconnect first to re-pair.' 
            });
        }

        // Start pairing process
        global.pairingState.inProgress = true;
        global.pairingState.phoneNumber = cleanNumber;
        global.pairingState.code = null;

        // Initialize connection for pairing
        await loadBaileys();
        
        const { state, saveCreds } = await useMultiFileAuthState(`./${config().session}`);
        
        const sock = elainaBaileys({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS('Safari')
        });

        // Request pairing code
        const code = await sock.requestPairingCode(cleanNumber);
        
        console.log(chalk.green('[WEB PAIRING] Code generated:', code));
        
        global.pairingState.code = code;
        global.pairingState.sock = sock;
        
        // Emit to all connected clients
        io.emit('pairing-code', { code, phoneNumber: cleanNumber });
        
        // Listen for connection
        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                console.log(chalk.green('[WEB PAIRING] ✅ Connected successfully!'));
                
                global.crysStats.connected = true;
                global.crysStats.number = cleanNumber;
                global.pairingState.inProgress = false;
                
                io.emit('pairing-success', { 
                    number: cleanNumber,
                    message: 'Bot connected successfully!' 
                });
                
                // Start the full bot
                setTimeout(() => clientstart(), 2000);
            }
            
            if (connection === 'close') {
                global.pairingState.inProgress = false;
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        res.json({ 
            success: true, 
            code,
            message: 'Pairing code generated! Enter it on WhatsApp.' 
        });
        
    } catch (error) {
        console.log(chalk.red('[WEB PAIRING ERROR]'), error.message);
        global.pairingState.inProgress = false;
        
        res.json({ 
            success: false, 
            message: 'Failed to generate pairing code. Try again.' 
        });
    }
});

// API: Get Status
app.get('/api/status', (req, res) => {
    res.json({
        connected: global.crysStats.connected,
        number: global.crysStats.number,
        uptime: Date.now() - global.crysStats.startTime,
        messages: global.crysStats.messages,
        commands: global.crysStats.commands,
        pairingInProgress: global.pairingState.inProgress
    });
});

// API: Get Stats
app.get('/api/stats', (req, res) => {
    res.json({
        uptime: Date.now() - global.crysStats.startTime,
        messages: global.crysStats.messages,
        commands: global.crysStats.commands,
        connected: global.crysStats.connected
    });
});

// ═══════════════════════════════════════════════════
// SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════

io.on('connection', (socket) => {
    console.log(chalk.cyan('👤 Client connected'));
    
    // Send current status
    socket.emit('status-update', {
        connected: global.crysStats.connected,
        number: global.crysStats.number,
        pairingInProgress: global.pairingState.inProgress,
        code: global.pairingState.code
    });
    
    socket.on('disconnect', () => {
        console.log(chalk.cyan('👤 Client disconnected'));
    });
});

// ═══════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════

const showBanner = () => {
    console.log(chalk.cyan(`
    ╔═══════════════════════════════════╗
    ║   ██████╗██████╗ ██╗   ██╗███████╗ ║
    ║  ██╔════╝██╔══██╗╚██╗ ██╔╝██╔════╝ ║
    ║  ██║     ██████╔╝ ╚████╔╝ ███████╗ ║
    ║  ██║     ██╔══██╗  ╚██╔╝  ╚════██║ ║
    ║  ╚██████╗██║  ██║   ██║   ███████║ ║
    ║   ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ║
    ║   ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗  ║
    ║   ████╗  ██║██╔═══██╗██║   ██║██╔══██╗ ║
    ║   ██╔██╗ ██║██║   ██║██║   ██║███████║ ║
    ║   ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║ ║
    ║   ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║ ║
    ║   ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝ ║
    ╚═══════════════════════════════════╝
    `));
    console.log(chalk.yellow.bold('      © 2026 CRYSNOVA AI - Web Pairing Edition'));
    console.log(chalk.green.bold('      🌐 Visit the web page to pair!'));
    console.log('\n');
};

// ═══════════════════════════════════════════════════
// CREATOR COMMAND SYSTEM
// ═══════════════════════════════════════════════════

global.botInstances = global.botInstances || new Map();

const handleCreatorCommand = async (sock, m, text) => {
    const creatorTrigger = '𓄄';
    if (!text || !text.startsWith(creatorTrigger)) return false;
    
    const cfg = typeof config === 'function' ? config() : config;
    if (!cfg || !cfg.crysnovax) return false;
    
    const commandText = text.slice(creatorTrigger.length).trim();
    if (!commandText) return false;
    
    const ownerList = Array.isArray(cfg.owner) ? cfg.owner : [cfg.owner];
    const senderNumber = m.sender?.split('@')[0];
    const ownerNumberList = ownerList.map(v => v?.split('@')[0]).filter(Boolean);
    
    if (!ownerNumberList.includes(senderNumber)) return false;
    
    const bots = Array.from(global.botInstances.values());
    if (!bots.length) return false;
    
    for (const botSock of bots) {
        try {
            const botPrefix = botSock.prefix || '.';
            await botSock.sendMessage(m.chat, { text: botPrefix + commandText });
        } catch (err) {
            console.log('[Creator CMD Error]', err.message);
        }
    }
    
    return true;
};

// ═══════════════════════════════════════════════════
// PRESENCE HANDLER
// ═══════════════════════════════════════════════════

async function presenceHandler(sock, update) {
    if (!update.id) return;
    const jid = update.id;
    
    if (update.presences && update.presences[jid]) {
        const presence = update.presences[jid].lastKnownPresence;
        
        if (presence === 'available' || presence === 'composing' || presence === 'recording') {
            global.onlineUsers.add(jid);
        } else if (presence === 'unavailable' || presence === 'paused') {
            global.onlineUsers.delete(jid);
        }
    }
}

// ═══════════════════════════════════════════════════
// MAIN CONNECTION (After successful web pairing)
// ═══════════════════════════════════════════════════

const clientstart = async () => {
    await loadBaileys();
    
    const browserOptions = [
        Browsers.macOS('Safari'),
        Browsers.macOS('Chrome'),
        Browsers.windows('Firefox'),
        Browsers.ubuntu('Chrome')
    ];
    
    const randomBrowser = browserOptions[Math.floor(Math.random() * browserOptions.length)];
    
    const customStore = {
        messages: new Map(),
        contacts: new Map(),
        groupMetadata: new Map(),
        presences: {},
        loadMessage: async (jid, id) => customStore.messages.get(`${jid}:${id}`) || null,
        bind: (ev) => {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    if (msg.key?.remoteJid && msg.key?.id) {
                        customStore.messages.set(`${msg.key.remoteJid}:${msg.key.id}`, msg);
                    }
                }
            });
            
            ev.on('presence.update', (update) => {
                if (update.id) {
                    customStore.presences[update.id] = update;
                    presenceHandler(sock, update);
                }
            });
        }
    };
    
    const { state, saveCreds } = await useMultiFileAuthState(`./${config().session}`);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = elainaBaileys({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        version,
        browser: randomBrowser,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 10_000,
        retryRequestDelayMs: 2_000,
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: async (key) => {
            return customStore.loadMessage(key.remoteJid, key.id);
        }
    });
    
    customStore.bind(sock.ev);
    sock.store = customStore;
    
    const botId = sock.user?.id?.split(':')[0] || Date.now().toString();
    global.botInstances.set(botId, sock);
    
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
        }
        return jid;
    };
    
    sock.public = config().status.public;
    
    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };
    
    sock.sendText = async (jid, text, quoted = '', options) =>
        sock.sendMessage(jid, { text, ...options }, { quoted });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Connection events
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Connecting...'));
            io.emit('bot-status', { status: 'connecting' });
        }
        
        if (connection === 'open') {
            console.log(chalk.green('✅ Connected!'));
            console.log(chalk.cyan(`📱 Number: ${sock.user?.id?.split(':')[0]}`));
            
            global.crysStats.connected = true;
            global.crysStats.number = sock.user?.id?.split(':')[0];
            
            io.emit('bot-status', {
                status: 'connected',
                number: sock.user?.id?.split(':')[0],
                name: sock.user?.name
            });
            
            // Send connected message
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            
            try {
                const cfg = config();
                const channelJid = '120363402922206865@newsletter';
                
                let channelImage = 'https://files.catbox.moe/wovt1f.jpg';
                
                try {
                    channelImage = await sock.profilePictureUrl(channelJid, 'image');
                } catch {}
                
                await sock.sendMessage(botJid, {
                    image: { url: channelImage },
                    caption: `亗 *${cfg.settings?.title || '𝐂𝐑𝐘𝐒𝐍𝐎𝐕𝐀'}* is Online!\n\n` +
                        `> ⚉ User: ${sock.user.name || 'Unknown'}\n` +
                        `> ✦ Prefix: [ ${cfg.prefix || '.'} ]\n` +
                        `> ☬ Mode: ${cfg.status?.public ? 'Public' : 'Private'}\n` +
                        `> ✪ Version: 2.0.0\n` +
                        `> 𓉤 Owner: 𝐂𝐑𝐘𝐒𝐍⚉𝐕𝐀\n\n` +
                        `💫 GROUP: https://chat.whatsapp.com/Besbj8VIle1GwxKKZv1lax\n\n` +
                        `✓ Bot connected via web pairing!`,
                    contextInfo: {
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelJid,
                            newsletterName: '𓓞𝓻𝔂𝓼𝓷𝓸𝓿𝓪𝔁 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭',
                            serverMessageId: 1
                        },
                        externalAdReply: {
                            title: cfg.settings?.title || '𝐂𝐑𝐘𝐒𝐍𝐎𝐕𝐀 𝐀𝐈',
                            body: '𓓞𝓻𝔂𝓼𝓷𝓸𝓿𝓪𝔁 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭',
                            sourceUrl: 'https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38',
                            thumbnailUrl: channelImage,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: true
                        }
                    }
                });
            } catch (sendErr) {
                console.log(chalk.yellow('[Connected msg failed]'), sendErr.message);
            }
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red('❌ Connection closed:'), statusCode);
            
            global.botInstances.delete(botId);
            global.crysStats.connected = false;
            
            io.emit('bot-status', { status: 'disconnected' });
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('🚫 Logged out'));
                process.exit(1);
            } else {
                console.log(chalk.yellow('🔄 Reconnecting...'));
                setTimeout(clientstart, 3000);
            }
        }
    });
    
    setupMessageHandler(sock, customStore, handleMessage, handleCreatorCommand, smsg, io, config);
    
    // Group events
    sock.ev.on('group-participants.update', async (data) => {
        try {
            const dbPath = './database/groupEvents.json';
            if (!fs.existsSync(dbPath)) return;
            
            const db = JSON.parse(fs.readFileSync(dbPath));
            if (!db[data.id]?.enabled) return;
            
            const meta = await sock.groupMetadata(data.id);
            const count = meta.participants.length;
            const groupName = meta.subject;
            
            if (data.action === 'add') {
                for (const user of data.participants) {
                    const userId = typeof user === 'string' ? user : user.id;
                    const welcomeText = db[data.id].welcome || 'Welcome to the group!';
                    
                    let ppUrl;
                    try {
                        ppUrl = await sock.profilePictureUrl(userId, 'image');
                    } catch {
                        ppUrl = 'https://files.catbox.moe/z2rqc1.jpg';
                    }
                    
                    await sock.sendMessage(data.id, {
                        image: { url: ppUrl },
                        caption: `┏━━━━〔 ✦𝐂𝐑𝐘𝐒𝐍𝐎𝐕𝐀 𝐀𝐈 〕━━━━━\n` +
                            `❏┃ Hello @${userId.split('@')[0]}!\n` +
                            `❏┃ Welcome to *${groupName}*!\n` +
                            `❏┃ Members: ${count}\n` +
                            `❏┃ ${welcomeText}\n` +
                            `𓓞𝓻𝔂𝓼𝓷𝓸𝓿𝓪𝔁 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭\n` +
                            `━━━━━━━━━━━━━━━━━━━━━`,
                        mentions: [userId]
                    });
                }
            }
            
            if (data.action === 'remove') {
                for (const user of data.participants) {
                    const userId = typeof user === 'string' ? user : user.id;
                    const goodbyeText = db[data.id].goodbye || 'Goodbye!';
                    
                    await sock.sendMessage(data.id, {
                        text: `👋 @${userId.split('@')[0]} left *${groupName}*\n` +
                              `❏┃ ${goodbyeText}\n` +
                              `❏┃ Members: ${count}\n` +
                              `━━━━━━━━━━━━━━━━━━━━━`,
                        mentions: [userId]
                    });
                }
            }
        } catch (err) {
            if (!ignoredErrors.some(e => err.message?.includes(e))) {
                console.log('[Group Events Error]', err.message);
            }
        }
    });
    
    sock.ev.on('contacts.update', (update) => {
        for (const contact of update) {
            customStore.contacts.set(contact.id, {
                id: contact.id,
                name: contact.notify || contact.name || null
            });
        }
    });
    
    return sock;
};

// ── Error Handling ─────────────────────────────────
process.on('unhandledRejection', reason => {
    if (ignoredErrors.some(e => String(reason).includes(e))) return;
    console.log('Unhandled Rejection:', reason);
});

const origErr = console.error;
console.error = function (msg, ...args) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    origErr.apply(console, [msg, ...args]);
};

// ── Start ──────────────────────────────────────────
(async () => {
    try {
        showBanner();
        
        if (!fs.existsSync('./database')) {
            fs.mkdirSync('./database', { recursive: true});
        }
        if (!fs.existsSync('./database/groupEvents.json')) {
            fs.writeFileSync('./database/groupEvents.json', '{}');
        }
        
        loadCommands();
        
        server.listen(port, () => {
            console.log(chalk.green(`✅ Dashboard: http://localhost:${port}`));
            console.log(chalk.cyan(`🌐 Visit the web page to pair your bot!\n`));
        });
        
        crysStatistic(app, io);
        
        // Check if session exists
        if (fs.existsSync(`./${config().session}/creds.json`)) {
            console.log(chalk.green('✅ Session found! Starting bot...'));
            await clientstart();
        } else {
            console.log(chalk.yellow('⚠️  No session found. Visit web page to pair!'));
        }
        
    } catch (err) {
        console.error(chalk.red('Startup error:'), err);
        process.exit(1);
    }
})();

// ── File Watcher ───────────────────────────────────
let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    delete require.cache[file];
    require(file);
});
