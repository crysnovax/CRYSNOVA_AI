const config = require('./settings/config');
const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const os = require('os');
const chalk = require("chalk");
const axios = require('axios');
const { exec } = require('child_process');
const { dechtml, fetchWithTimeout } = require('./library/function');       
const { tempfiles } = require("./library/uploader");
const { fquoted } = require('./library/quoted');     
const Api = require('./library/Api');

const image = fs.readFileSync('./thumbnail/image.jpg');
const docu = fs.readFileSync('./thumbnail/document.jpg');

let jidNormalizedUser, getContentType, isPnUser;

const loadBaileysUtils = async () => {
    const baileys = await import('@whiskeysockets/baileys');
    jidNormalizedUser = baileys.jidNormalizedUser;
    getContentType = baileys.getContentType;
    isPnUser = baileys.isPnUser;
};

// Plugin Loader System with Menu Categorization
class PluginLoader {
    constructor() {
        this.plugins = new Map();
        this.categories = new Map();
        this.pluginsDir = path.join(__dirname, 'plugins');
        this.defaultCategories = {
            'ai': '🤖 AI MENU',
            'downloader': '📥 DOWNLOAD MENU',
            'fun': '🎮 FUN MENU',
            'general': '⚡ GENERAL MENU',
            'group': '👥 GROUP MENU',
            'owner': '👑 OWNER MENU',
            'other': '📦 OTHER MENU',
            'tools': '🛠️ TOOLS MENU',
            'video': '🎬 VIDEO MENU'
        };
        this.loadPlugins();
    }

    loadPlugins() {
        try {
            // Create plugins directory if it doesn't exist
            if (!fs.existsSync(this.pluginsDir)) {
                fs.mkdirSync(this.pluginsDir, { recursive: true });
                console.log(chalk.cyan('📁 Created plugins directory'));
                return;
            }

            // Read all plugin files
            const pluginFiles = fs.readdirSync(this.pluginsDir).filter(file => 
                file.endsWith('.js') && !file.startsWith('_')
            );

            // Clear existing plugins and categories
            this.plugins.clear();
            this.categories.clear();

            // Initialize categories
            Object.keys(this.defaultCategories).forEach(cat => {
                this.categories.set(cat, []);
            });

            // Load each plugin
            for (const file of pluginFiles) {
                try {
                    const pluginPath = path.join(this.pluginsDir, file);
                    const plugin = require(pluginPath);
                    
                    if (plugin.command && typeof plugin.execute === 'function') {
                        // Set default category if not provided
                        if (!plugin.category) {
                            plugin.category = 'general';
                        }
                        
                        // Ensure category exists
                        if (!this.categories.has(plugin.category)) {
                            this.categories.set(plugin.category, []);
                        }
                        
                        this.plugins.set(plugin.command, plugin);
                        this.categories.get(plugin.category).push(plugin.command);
                        
                        console.log(chalk.green(`✅ Loaded plugin: ${plugin.command} (${plugin.category})`));
                    } else {
                        console.log(chalk.yellow(`⚠️  Invalid plugin structure in: ${file}`));
                    }
                } catch (error) {
                    console.log(chalk.red(`❌ Failed to load plugin ${file}:`, error.message));
                }
            }

            console.log(chalk.cyan(`📦 Loaded ${this.plugins.size} plugins across ${this.categories.size} categories`));
        } catch (error) {
            console.log(chalk.red('❌ Error loading plugins:', error.message));
        }
    }

    async executePlugin(command, sock, m, args, text, q, quoted, mime, qmsg, isMedia, groupMetadata, groupName, participants, groupOwner, groupAdmins, isBotAdmins, isAdmins, isGroupOwner, isCreator, prefix, reply, sender) {
        const plugin = this.plugins.get(command);
        if (!plugin) return false;

        try {
            // Check if plugin is owner-only
            if (plugin.owner && !isCreator) {
                return true; // Silent - don't respond
            }

            // Check if plugin is group-only
            if (plugin.group && !m.isGroup) {
                return true; // Silent - don't respond
            }

            // Check if plugin requires admin
            if (plugin.admin && m.isGroup && !isAdmins && !isCreator) {
                return true; // Silent - don't respond
            }

            await plugin.execute(sock, m, {
                args,
                text,
                q,
                quoted,
                mime,
                qmsg,
                isMedia,
                groupMetadata,
                groupName,
                participants,
                groupOwner,
                groupAdmins,
                isBotAdmins,
                isAdmins,
                isGroupOwner,
                isCreator,
                prefix,
                reply,
                config,
                sender
            });
            return true;
        } catch (error) {
            console.log(chalk.red(`❌ Error executing plugin ${command}:`, error));
            return true; // Silent - don't respond with error
        }
    }

    getPluginCommands() {
        return Array.from(this.plugins.keys());
    }

    getMenuSections() {
        const sections = [];
        
        // Sort categories alphabetically by their display name
        const sortedCategories = Array.from(this.categories.entries())
            .filter(([category, commands]) => commands.length > 0 && this.defaultCategories[category])
            .sort(([catA], [catB]) => {
                const nameA = this.defaultCategories[catA];
                const nameB = this.defaultCategories[catB];
                return nameA.localeCompare(nameB);
            });
        
        for (const [category, commands] of sortedCategories) {
            const categoryName = this.defaultCategories[category];
            // Sort commands alphabetically
            const sortedCommands = commands.sort();
            const commandList = sortedCommands.map(cmd => {
                const plugin = this.plugins.get(cmd);
                return `︱✗ ${cmd}${plugin.description ? ` - ${plugin.description}` : ''}`;
            }).join('\n');
            
            sections.push(`╾─╼▣ ${categoryName}\n${commandList}\n╿─╼▣`);
        }
        
        return sections.join('\n\n');
    }

    getPluginCount() {
        let count = 0;
        for (const commands of this.categories.values()) {
            count += commands.length;
        }
        return count;
    }

    reloadPlugins() {
        // Clear require cache for plugin files
        const pluginFiles = fs.readdirSync(this.pluginsDir).filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );

        for (const file of pluginFiles) {
            const pluginPath = path.join(this.pluginsDir, file);
            delete require.cache[require.resolve(pluginPath)];
        }

        // Reload plugins
        this.loadPlugins();
    }
}

// Initialize plugin loader
const pluginLoader = new PluginLoader();

module.exports = sock = async (sock, m, chatUpdate, store) => {
    try {
        if (!jidNormalizedUser || !getContentType || !isPnUser) {
            await loadBaileysUtils();
        }

        const body = (
            m.mtype === "conversation" ? m.message.conversation :
            m.mtype === "imageMessage" ? m.message.imageMessage.caption :
            m.mtype === "videoMessage" ? m.message.videoMessage.caption :
            m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
            m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
            m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId ||
            m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text : ""
        );
        
        const sender = m.key.fromMe ? sock.user.id.split(":")[0] + "@s.whatsapp.net" ||
              sock.user.id : m.key.participant || m.key.remoteJid;
        
        const senderNumber = sender.split('@')[0];
        const budy = (typeof m.text === 'string' ? m.text : '');
        const prefa = ["", "!", ".", ",", "🤖", "🗿"];

        const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤Ω Φ_&><`™©®Δ^βα~¦|/\\©^]/;
        const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : '.';
        const from = m.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const botNumber = await sock.decodeJid(sock.user.id);
        const isBot = botNumber.includes(senderNumber);
        
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const command2 = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase();
        const args = body.trim().split(/ +/).slice(1);
        const pushname = m.pushName || "No Name";
        const text = q = args.join(" ");
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const qmsg = (quoted.msg || quoted);
        const isMedia = /image|video|sticker|audio/.test(mime);
        const groupMetadata = m?.isGroup ? await sock.groupMetadata(m.chat).catch(() => ({})) : {};
        const groupName = m?.isGroup ? groupMetadata.subject || '' : '';
        
        const participants = m?.isGroup ? groupMetadata.participants?.map(p => {
            let admin = null;
            if (p.admin === 'superadmin') admin = 'superadmin';
            else if (p.admin === 'admin') admin = 'admin';
            return {
                id: p.id || null,
                lid: p.lid || null,
                phoneNumber: p.phoneNumber || null,
                admin,
                full: p
            };
        }) || [] : [];
        
        const groupOwner = m?.isGroup ? groupMetadata.owner || '' : '';
        const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
        const isBotAdmins = m?.isGroup ? groupAdmins.includes(botNumber) : false;
        const isAdmins = m?.isGroup ? groupAdmins.includes(m.sender) : false;
        const isGroupOwner = m?.isGroup ? groupOwner === m.sender : false;
        const isCreator = jidNormalizedUser(m.sender) === jidNormalizedUser(botNumber);

        if (isCmd) {
            console.log(chalk.hex("#6c5ce7")("# New Message"));
            console.log(`- Date  : ${chalk.white(new Date().toLocaleString())}`);
            console.log(`- Message    : ${chalk.white(command)}`);
            console.log(`- Sender : ${chalk.white(pushname)}`);
            console.log(`- JID      : ${chalk.white(senderNumber)}`);
            console.log(`ㅤ\n`);
        }
        
        async function reply(text) {
            sock.sendMessage(m.chat, {
                text: text,
                contextInfo: {
                    mentionedJid: [sender],
                    externalAdReply: {
                        title: config.settings.title,
                        body: config.settings.description,
                        thumbnailUrl: config.thumbUrl,
                        renderLargerThumbnail: false,
                    }
                }
            }, { quoted: m });
        }

        // Try to execute plugin first
        const pluginExecuted = await pluginLoader.executePlugin(
            command, sock, m, args, text, q, quoted, mime, qmsg, isMedia, 
            groupMetadata, groupName, participants, groupOwner, groupAdmins, 
            isBotAdmins, isAdmins, isGroupOwner, isCreator, prefix, reply, sender
        );

        // If plugin was executed, stop here
        if (pluginExecuted) return;

        // Only built-in essential commands remain
        switch (command) {
            case 'menu': {
                const usedMem = process.memoryUsage().heapUsed / 1024 / 1024;
                const totalMem = os.totalmem() / 1024 / 1024 / 1024;
                const memPercent = (usedMem / (totalMem * 1024)) * 100;
                const ramBar = '▣'.repeat(Math.floor(memPercent / 20)) + '▢'.repeat(5 - Math.floor(memPercent / 20));
                const uptimeSec = process.uptime();
                const days = Math.floor(uptimeSec / (3600 * 24));
                const hours = Math.floor((uptimeSec % (3600 * 24)) / 3600);
                const minutes = Math.floor((uptimeSec % 3600) / 60);
                const seconds = Math.floor(uptimeSec % 60);
                const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                const ping = Date.now() - m.messageTimestamp * 1000;
                const host = os.platform();
                const mode = sock.public ? 'Public' : 'Self';

                const pluginMenuSections = pluginLoader.getMenuSections();
                const totalCommands = pluginLoader.getPluginCount();

                const K0MRAID = `
╔〘 *WA-BASE-BOT* 
║ 👑 *Owner:* Debraj 
║ 🧩 *Prefix:* [ . ]
║ 🖥️ *Host:* ${host}
║ 🧠 *Commands:* ${totalCommands}
║ ⚙️ *Mode:* ${mode}
║ ⏱️ *Uptime:* ${uptime}
║ ⚡ *Ping:* ${ping.toFixed(0)} ms
║ 📊 *RAM Used:* ${usedMem.toFixed(2)} MB / ${totalMem.toFixed(2)} GB
║ 🧬 *RAM:* [${ramBar}] ${memPercent.toFixed(2)}%
╚═〘 *System Status*

${pluginMenuSections}`;

                await sock.sendMessage(m.chat, {
                    image: image,
                    caption: K0MRAID,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 1,
                        isForwarded: false,
                        externalAdReply: {
                            title: "Simple WA Base Bot",
                            body: "Official Dev Account URL",
                            mediaType: 3,
                            thumbnailUrl: config.thumbUrl,
                            mediaUrl: "https://t.me/debrajzero",
                            sourceUrl: "https://t.me/debrajzero",
                            showAdAttribution: true,
                            renderLargerThumbnail: false
                        }
                    }
                }, { quoted: m });
                break;
            }
            
            case 'reload': {
                if (!isCreator) return; // Silent - don't respond
                pluginLoader.reloadPlugins();
                await reply(`✅ Plugins reloaded! Loaded ${pluginLoader.getPluginCount()} commands across ${pluginLoader.categories.size} categories.`);
                break;
            }
            
            // No default case - stay silent for unknown commands
        }
    } catch (err) {
        console.log(require("util").format(err));
    }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});