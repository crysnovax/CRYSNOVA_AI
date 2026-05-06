const path = require('path');
const fs = require('fs');

const GREETED_FILE = path.join(__dirname, '../../../database/greeted-contacts.json');

let greetedContacts = new Set();

// Load greeted contacts
try {
    if (fs.existsSync(GREETED_FILE)) {
        const data = JSON.parse(fs.readFileSync(GREETED_FILE, 'utf8'));
        greetedContacts = new Set(data.contacts || []);
    }
} catch (e) {}

function saveGreeted() {
    fs.mkdirSync(path.dirname(GREETED_FILE), { recursive: true });
    fs.writeFileSync(GREETED_FILE, JSON.stringify({ contacts: [...greetedContacts] }, null, 2));
}

let greetConfig = {
    enabled: false,
    greeting: null,
    faqHandler: null
};

module.exports = {
    name: 'greet',
    alias: [],
    category: 'Owner',
    desc: 'Auto welcome new customers with business support options',
    usage: '.greet on | .greet test',
    ownerOnly: true,

    execute: async (sock, m, { args, reply }) => {
        const sub = args[0]?.toLowerCase();

        const greeting = `╭─❍ *WELCOME TO CRYSNOVA BUSINESS* 💼
│
│ 👋 Hello Valued Customer!
│
│ 🏢 Professional Digital Services
│ ⚡ Fast & Reliable Support
│ 🚀 Powered by CRYSNOVA
│
│ *How can we assist you today?*
╰──────────────────`;

        if (sub === 'test') {
            await sock.sendMessage(m.sender, {
                text: greeting,
                footer: '💼 CRYSNOVA BUSINESS',
                buttons: [{
                    text: '📋 Business Menu',
                    sections: [{
                        title: '🛍️ Customer Support',
                        rows: [
                            { header: '', title: '📦 Our Services', description: 'View available services', id: '#greet_services' },
                            { header: '', title: '💰 Pricing', description: 'Check prices & packages', id: '#greet_prices' },
                            { header: '', title: '📞 Contact Support', description: 'Talk to customer care', id: '#greet_support' },
                            { header: '', title: '📢 Updates Channel', description: 'Latest news & updates', id: '#greet_channel' }
                        ]
                    }]
                }]
            });

            return reply('_*🏷️ Business greeting sent to your DM!*_');
        }

        if (sub === 'on') {
            greetConfig.enabled = true;
            greetConfig.greeting = greeting;

            greetConfig.faqHandler = async (jid, faqId) => {
                switch (faqId) {

                    case '#greet_services':
                        await sock.sendMessage(jid, {
                            text: `📦 *OUR SERVICES*

• WhatsApp Bot Development
• AI Integrations
• Bot Hosting
• Automation Services
• Custom Features
• Technical Support`
                        });
                        break;

                    case '#greet_prices':
                        await sock.sendMessage(jid, {
                            text: `💰 *PRICING & PACKAGES*

🟢 Basic Package
🟡 Premium Package
🔴 Enterprise Package

Contact support for full pricing details.`
                        });
                        break;

                    case '#greet_support':
                        await sock.sendMessage(jid, {
                            text: `📞 *CUSTOMER SUPPORT*

Need help?
Reply to this chat or use:

*.owner*

We usually respond quickly.`
                        });
                        break;

                    case '#greet_channel':
                        await sock.sendMessage(jid, {
                            text: `📢 *OFFICIAL CHANNEL*

Stay updated with announcements and new features:

https://whatsapp.com/channel/0029Vb6pe77K0IBn48HLKb38`
                        });
                        break;
                }
            };

            return reply('_*🏷️ Business Auto Welcome ON!*_\n\n_New customers will now receive a professional welcome message._');
        }

        return reply('💼 *.greet on* | *.greet test*');
    },

    greetConfig,
    greetedContacts,
    saveGreeted,

    handleNewContact: async (sock, sender, isGroup) => {
        if (!greetConfig.enabled) return;
        if (isGroup) return;
        if (greetedContacts.has(sender)) return;

        greetedContacts.add(sender);
        saveGreeted();

        await sock.sendMessage(sender, {
            text: greetConfig.greeting || '👋 Welcome to our business!',
            footer: '💼 CRYSNOVA BUSINESS',
            buttons: [{
                text: '📋 Business Menu',
                sections: [{
                    title: '🛍️ Customer Support',
                    rows: [
                        { header: '', title: '📦 Our Services', description: 'View available services', id: '#greet_services' },
                        { header: '', title: '💰 Pricing', description: 'Check prices & packages', id: '#greet_prices' },
                        { header: '', title: '📞 Contact Support', description: 'Talk to customer care', id: '#greet_support' },
                        { header: '', title: '📢 Updates Channel', description: 'Latest news & updates', id: '#greet_channel' }
                    ]
                }]
            }]
        });
    },

    handleGreetButton: async (sock, m) => {
        const buttonId =
            m.msg?.buttonsResponseMessage?.selectedButtonId ||
            m.msg?.templateButtonReplyMessage?.selectedId ||
            m.msg?.listResponseMessage?.singleSelectReply?.selectedRowId;

        if (!buttonId || !buttonId.startsWith('#greet_')) return false;

        if (greetConfig.faqHandler) {
            await greetConfig.faqHandler(m.sender, buttonId);
        }

        return true;
    }
};
