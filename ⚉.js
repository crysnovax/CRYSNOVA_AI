// © 2026 CRYSNOVA AI – ZEE BOT Core
// Clean rewrite: deobfuscated with web pairing API routes

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const socketIo  = require('socket.io');
const path      = require('path');
const readline  = require('readline');
const fs        = require('fs');
const chalk     = require('chalk');
const pino      = require('pino');
const { Boom }  = require('@hapi/boom');
const {
    default: makeWASocket,
    Browsers,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
} = require('@crysnovax/baileys');

const { smsg }                   = require('./library/serialize');
const { konek }                  = require('./library/connection/connection');
const { loadCommands }           = require('./src/Plugin/crysLoadCmd');
const { handleMessage }          = require('./src/Plugin/crysMsg');
const { crysStatistic }          = require('./src/Plugin/crysStatistic');

// ─── Express + Socket.IO ───────────────────────────────────────────
const app    = express();
const port   = process.env.PORT || 3000;
const server = http.createServer(app);
const io     = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Public')));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'Public', 'index.html')));

// ─── Globals ───────────────────────────────────────────────────────
global.stats      = { messages: 0, commands: 0, startTime: Date.now(), uptime: 0 };
global.botInstances  = global.botInstances  || new Map();
global.onlineUsers   = global.onlineUsers   || new Set();
if (!global.crysStats) global.crysStats = new Map();

// ─── Ignored errors (suppress noisy logs) ──────────────────────────
const ignoredErrors = [
    'ECONNRESET', 'EKEYTYPE', 'item-not-found', 'rate-overlimit',
    'Bad MAC', 'Timed Out', 'decrypt error', 'Socket connection timeout',
    'network timeout', 'Connection Closed', 'read ECONNRESET',
    'write ECONNRESET', 'connect ETIMEDOUT', 'Connection terminated',
    'ECONNREFUSED', 'Session closed', 'Socket closed', 'Connection Closed',
    'test',
];

// ─── Console UI ─────────────────────────────────────────────────────
const timestamp = () => new Date().toISOString().slice(11, 19);
const rawConsoleLog = console.log.bind(console);
const rawConsoleError = console.error.bind(console);
const writeLog = (level, message, ...args) => {
    const palette = { INFO: chalk.cyan, OK: chalk.green, WARN: chalk.yellow, ERROR: chalk.red, SYSTEM: chalk.magenta };
    const color = palette[level] || chalk.white;
    rawConsoleLog(`${chalk.gray(timestamp())} ${color(String(level).padEnd(6))} ${chalk.gray('›')} ${message}`, ...args);
};

// Keep third-party and session messages on the same timestamped console stream.
console.log = (message, ...args) => rawConsoleLog(`${chalk.gray(timestamp())} ${message ?? ''}`, ...args);
console.warn = (message, ...args) => rawConsoleLog(`${chalk.gray(timestamp())} ${chalk.yellow(message ?? '')}`, ...args);
console.error = (message, ...args) => rawConsoleError(`${chalk.gray(timestamp())} ${chalk.red(message ?? '')}`, ...args);

const logStartup = () => {
    writeLog('SYSTEM', 'WhatsApp multi-device runtime starting');
    writeLog('INFO', 'Runtime: %s · Transport: @crysnovax/baileys', process.version);
};

// ─── Readline helper ───────────────────────────────────────────────
const question = (prompt) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(chalk.yellow(prompt), (answer) => { resolve(answer); rl.close(); });
    });
};

// ─── Bot startup ───────────────────────────────────────────────────
const clientstart = async () => {
    const getConfig = () => require('./settings/config');
    logStartup();

    // Random browser fingerprint
    const browsers = [
        Browsers.macOS('Safari'),
        Browsers.macOS('Chrome'),
        Browsers.windows('Firefox'),
        Browsers.ubuntu('Chrome'),
    ];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];

    // In-memory message/contact store
    const store = {
        messages: new Map(),
        contacts: new Map(),
        groupMetadata: new Map(),
        presences: {},
        loadMessage: async (jid, id) => store.messages.get(jid + ':' + id) || null,
        bind: (ev) => {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    if (msg.key?.remoteJid && msg.key?.id) {
                        store.messages.set(msg.key.remoteJid + ':' + msg.key.id, msg);
                    }
                }
            });
            ev.on('contacts.update', (updates) => {
                for (const u of updates) { if (u.id) store.contacts[u.id] = u; }
            });
        },
    };

    // Auth state
    const { state, saveCreds } = await useMultiFileAuthState('./' + getConfig().session);
    const { version } = await fetchLatestBaileysVersion();

    // Create socket
    const sock = makeWASocket({
        logger: pino({
            // Keep Baileys transport JSON out of hosted consoles by default; set LOG_LEVEL=info for protocol diagnostics.
            level: process.env.LOG_LEVEL || 'silent',
            timestamp: pino.stdTimeFunctions.isoTime,
        }),
        printQRInTerminal: !getConfig().status.terminal,
        auth: state,
        version,
        browser,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
        fireInitQueries: true,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: async (key) => store.loadMessage(key.remoteJid, key.id),
    });

    // Store socket globally for API routes
    global.sock = sock;
    global.io   = io;

    // Pair-code mode — collect the digits-only number before requesting a code
    let needsPairing = false;
    let pairingNumber = null;
    let pairingRequested = false;
    if (getConfig().status.terminal && !sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 800));
        writeLog('SYSTEM', 'PAIR-CODE MODE · CRYSNOVA AI');
        const number = await question('Enter your WhatsApp number (without +):\nNumber → ');
        pairingNumber = number.replace(/[^0-9]/g, '').trim();
        needsPairing = true;
    }

    // Bind store
    store.bind(sock.ev);
    sock.store = store;

    const botInstanceId = sock.user?.id?.split(':')[0] || Date.now().toString();
    global.botInstances.set(botInstanceId, sock);

    // decodeJid helper
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decoded = jidDecode(jid) || {};
            return decoded.user && decoded.server ? decoded.user + '@' + decoded.server : jid;
        }
        return jid;
    };

    sock.public  = getConfig().status.public;
    sock.downloadMediaMessage = async (msg) => {
        let mimeType = (msg.message || msg)?.mimetype || '';
        let mediaType = msg.mtype ? msg.mtype.replace(/Message/gi, '') : mimeType.split('/')[0];
        const stream = await downloadContentFromMessage(msg, mediaType);
        let buffer = Buffer.concat([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };
    sock.sendText = async (jid, text, quoted = '', options = {}) =>
        sock.sendMessage(jid, { text, ...options }, { quoted });

    // ─── Event: creds.update ───────────────────────────────────────
    sock.ev.on('creds.update', saveCreds);

    // ─── Event: connection.update ──────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) sock.pairingReady = true;
        if (connection === 'connecting' && !sock.pairingReady) sock.pairingReady = false;

        if (connection === 'connecting') {
            sock.connectionOpen = false;
            writeLog('INFO', 'Connecting to WhatsApp transport...');
        }

        // WhatsApp accepts pair-code requests only after its internal handshake
        // is ready. Calling immediately can fail with 428/405. No QR is shown.
        if ((qr || connection === 'open') && needsPairing && pairingNumber && !pairingRequested) {
            pairingRequested = true;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        writeLog('INFO', 'Requesting pair code for %s · attempt %d/3', pairingNumber, attempt);
                        const code = await sock.requestPairingCode(pairingNumber, 'CRYSNOVA');

                        writeLog('OK', 'Pair code generated successfully: %s', code);
                        writeLog('INFO', 'WhatsApp → Settings → Linked Devices → Link a Device → Enter code');
                        break;
                    } catch (pairErr) {
                        writeLog('WARN', 'Pair-code attempt %d failed: %s', attempt, pairErr.message);
                        if (attempt < 3) {
                            writeLog('INFO', 'Retrying pair-code request in 3 seconds...');
                            await new Promise(r => setTimeout(r, 3000));
                        } else {
                            pairingRequested = false;
                        }
                    }
                }
            if (connection !== 'open') return;
        }

        if (connection === 'open') {
            sock.connectionOpen = true;

            writeLog('OK', 'WhatsApp session connected · account %s', sock.user?.id?.split(':')[0]);
            writeLog('INFO', 'Dashboard available at http://localhost:%s', port);
            io.emit('bot-status', {
                status: 'connected',
                number: sock.user?.id?.split(':')[0],
                name: sock.user?.name,
            });

            // Send connected message
            const config = getConfig();
            const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const SUCCESS_MEDIA_URL = config.settings?.thumbUrl || 'https://cdn.crysnovax.link/files/1783469167623-6d58c43c-68b4-41ce-87ab-c0da1f615b28.mp4';
            const isGif = /\.(mp4|gif|webm|mov)$/i.test(SUCCESS_MEDIA_URL);
            const newsletterJid = '120363402922206865@newsletter';

            try {
                const successPayload = {
                    caption: '亗 *CRYSNOVA AI* is Online!\n\n' +
                        '❏▸ ⟁⃝𓋎 User⇆ 𝗰𝗿𝘆𝘀𝗻ᝪ𝘃𝗮メ\n' +
                        '❏▸ 彡 Prefix⇆ [ / ]\n' +
                        '❏▸ ⎔ Mode⇆ Private\n' +
                        '❏▸ ⓘ Version⇆ 𝚉̷𝙴̷ ̷𝙱̷𝙾̷𝚃̷\n' +
                        '❏▸ ℘ Owner⇆ ₵ⱤɎ₴₦☠︎︎V₳\n\n' +
                        '💫 GROUP: https://sl.crysnovax.link/WHATSAPP\n\n' +
                        '`×͜× BOT IS LIVE! ✧`\n',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        participant: newsletterJid,
                        remoteJid: newsletterJid,
                        quotedMessage: { conversation: '⧇⧇:⧇祺                    ☕︎' },
                        forwardedNewsletterMessageInfo: {
                            newsletterJid,
                            newsletterName: '⧇祺        ⸹          CRYSNOVA AI ☕︎',
                            serverMessageId: 1,
                        },
                    },
                };
                if (isGif) { successPayload.video = { url: SUCCESS_MEDIA_URL }; successPayload.gifPlayback = true; }
                else { successPayload.image = { url: SUCCESS_MEDIA_URL }; }
                await sock.sendMessage(ownerJid, successPayload);
                console.log(chalk.green('✅ Connected message sent!'));
            } catch (e) {
                console.log(chalk.red('[Connected msg failed]'), e.message);
            }
        }

        if (connection === 'close') {
            sock.connectionOpen = false;
            sock.pairingReady = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            writeLog('WARN', 'WhatsApp connection closed · status %s', statusCode || 'unknown');
            global.botInstances.delete(botInstanceId);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.magenta('🚫 Logged out. Delete session folder and restart.'));
                process.exit(1);
            }
            writeLog('INFO', 'Reconnecting in 3 seconds...');
            setTimeout(clientstart, 3000);

            try {
                konek({ sock, update, clientstart, DisconnectReason, Boom });
            } catch {}
        }
    });

    // ─── Message handler ───────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages || []) {
            try {
                const serialized = await smsg(sock, message, store);
                await handleMessage(sock, serialized, store);
            } catch (error) {
                console.error(chalk.red('[MESSAGE HANDLER ERROR]'), error.message);
            }
        }
    });

    // ─── Group participant events ──────────────────────────────────
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const groupEventsPath = path.join(process.cwd(), 'database/groupEvents.json');
            if (!fs.existsSync(groupEventsPath)) return;
            const groupEvents = JSON.parse(fs.readFileSync(groupEventsPath, 'utf8'));
            if (!groupEvents[update.id]?.enabled) return;

            const metadata = await sock.groupMetadata(update.id);
            const memberCount = metadata.participants.length;
            const groupName = metadata.subject;

            for (const participant of update.participants) {
                const jid = typeof participant === 'string' ? participant : participant.id;

                if (update.action === 'add') {
                    let ppUrl;
                    try { ppUrl = await sock.profilePictureUrl(jid, 'image'); }
                    catch { ppUrl = 'https://cdn.crysnovax.link/files/1782163404491-f8a40261-8b0f-4726-89db-2da753df47e4.jpeg'; }

                    await sock.sendMessage(update.id, {
                        image: { url: ppUrl },
                        caption: '💫 GROUP: ' + groupName +
                            '\n❏┃ Members: ' + memberCount + '\n' +
                            '👋 @' + jid.split('@')[0] + '!\n' +
                            '❏┃ Welcome to *' + groupName + '!\n' +
                            '❏┃ ' + (groupEvents[update.id]?.welcome || 'Welcome to the group!') + '\n\n' +
                            '━━━━━━━━━━━━━━━━━━━━━\n' +
                            '© 2026 ZEE BOT | by CRYSNOVA',
                        mentions: [jid],
                    });
                }

                if (update.action === 'remove') {
                    await sock.sendMessage(update.id, {
                        text: '亗 *' + jid.split('@')[0] + ' left *' + groupName + '*\n' +
                            '❏┃ ' + (groupEvents[update.id]?.goodbye || 'Goodbye!') + '\n' +
                            '❏┃ Members: ' + memberCount + '\n' +
                            '━━━━━━━━━━━━━━━━━━━━━\n' +
                            '© 2026 ZEE BOT | by CRYSNOVA',
                        mentions: [jid],
                    });
                }
            }
        } catch (err) {
            if (!ignoredErrors.some((e) => err.message?.includes(e)))
                console.log('[Group Events Error]', err.message);
        }
    });

    // ─── Contacts update ───────────────────────────────────────────
    sock.ev.on('contacts.update', (updates) => {
        for (const u of updates) {
            store.contacts[u.id] = { id: u.id, name: u.notify || u.name || null };
        }
    });

    return sock;
};

// ═══════════════════════════════════════════════════════════════════
// WEB PAIRING API ROUTES  (fixes 405 errors from dashboard)
// ═══════════════════════════════════════════════════════════════════

// GET /api/status — return bot connection status
app.get('/api/status', (_req, res) => {
    const sock = global.sock;
    if (sock && sock.user) {
        return res.json({
            connected: true,
            number: sock.user.id?.split(':')[0] || null,
            name: sock.user.name || null,
        });
    }
    res.json({ connected: false });
});

// POST /api/request-pairing — generate pairing code via web dashboard
app.post('/api/request-pairing', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 10) {
            return res.json({ success: false, message: 'Invalid phone number. Must be at least 10 digits.' });
        }

        const cleanNumber = phone.replace(/[^0-9]/g, '').trim();
        const sock = global.sock;
        const sockIo = global.io || io;

        if (!sock) {
            return res.json({ success: false, message: 'Bot is not started yet. Please wait...' });
        }

        if (sock.user) {
            return res.json({ success: false, message: 'Bot is already connected to a WhatsApp account.' });
        }

        // Pair codes require the internal handshake to be ready, not authenticated open.
        if (!sock.pairingReady) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout waiting for pairing readiness')), 30000);
                const check = setInterval(() => {
                    if (sock.pairingReady) { clearInterval(check); clearTimeout(timeout); resolve(); }
                }, 250);
            });
        }

        console.log(chalk.yellow('\n⏳ Requesting pairing code for: ' + cleanNumber));

        // Request pairing code from WhatsApp
        const code = await sock.requestPairingCode(cleanNumber, 'CRYSNOVA');

        console.log(chalk.green('✅ Pairing code generated: ' + code));

        // Emit code via Socket.IO
        sockIo.emit('pairing-code', { code, expiresIn: 300 });
        sockIo.emit('pairing-status', {
            status: 'Code Generated',
            message: 'Enter this code on WhatsApp within 5 minutes',
        });

        // Return via REST API as well
        return res.json({
            success: true,
            code,
            message: 'Code generated! You have 5 minutes to pair.',
            expiresIn: 300,
        });
    } catch (error) {
        console.error(chalk.red('[Pairing Error]'), error.message);

        if (global.io) {
            global.io.emit('pairing-failed', { message: error.message || 'Failed to generate pairing code' });
        }

        return res.json({
            success: false,
            message: error.message || 'Failed to generate pairing code. Please try again.',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// MAIN STARTUP
// ═══════════════════════════════════════════════════════════════════
(async () => {
    try {
        // Ensure directories exist
        if (!fs.existsSync('./database'))    fs.mkdirSync('./database', { recursive: true });
        if (!fs.existsSync('./sessions'))    fs.mkdirSync('./sessions', { recursive: true });
        if (!fs.existsSync('./database/antilink.json'))  fs.writeFileSync('./database/antilink.json', '{}');
        if (!fs.existsSync('./database/groupEvents.json')) fs.writeFileSync('./database/groupEvents.json', '{}');
        if (!fs.existsSync('./database/runtime-config.json')) fs.writeFileSync('./database/runtime-config.json', '{}');

        loadCommands();

        server.listen(port, () => {
            writeLog('OK', 'Dashboard listening on http://localhost:%s', port);
        });

        crysStatistic(app, io);

        io.on('connection', (socket) => {
            writeLog('INFO', 'Dashboard client connected');
            socket.emit('bot-status', global.stats);
            socket.on('disconnect', () => writeLog('INFO', 'Dashboard client disconnected'));
        });

        await clientstart();
    } catch (err) {
        writeLog('ERROR', 'Startup failed: %s', err?.stack || err?.message || err);
        process.exit(1);
    }
})();

// ─── Unhandled rejections ──────────────────────────────────────────
process.on('unhandledRejection', (err) => {
    if (ignoredErrors.some((e) => String(err).includes(e))) return;
    console.log('Unhandled Rejection:', err);
});

const origErr = console.error;
console.error = function (...args) {
    if (typeof args[0] === 'string' && ignoredErrors.some((e) => args[0].includes(e))) return;
    origErr.apply(console, args);
};

// ─── Hot reload ────────────────────────────────────────────────────
let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    delete require.cache[file];
    require(file);
});
