// © 2026 CRYSNOVA AI V2.0 - All Rights Reserved.

const fs = require('fs');

const config = {
    owner: "2348077528901",
    botNumber: "2348077528901",
    session: "sessions",
    thumbUrl: "https://i.ibb.co/pBrzZDQj/20260212-111751.jpg",
    status: {
        public: false,
        terminal: true,
        reactsw: true
    },
    message: {
        owner: "no, this is for owners only by crysnova ☠️",
        group: "this is for groups only by crysnova ☠️",
        admin: "this command is for admin only by crysnova ☠️",
        private: "this is specifically for private chat by crysnova ☠️"
    },
    mess: {
        owner: 'This command is only for the bot owner! by crysnova ☠️',
        done: 'Mode changed successfully! ✓𓄄',
        error: 'Something went wrong!✘𓄄',
        wait: 'Please wait...⚉'
    },
    settings: {
        title: "CRYSN⚉VA AI V2",
        packname: 'CRYSNOVA',
        description: "Professional WhatsApp Bot - CRYSNOVA AI V2.0",
        author: 'https://github.com/crysnovax/CRYSNOVA_AI',
        footer: "𝗖𝗥𝗬𝗦𝗡𝗢𝗩𝗔: @crysnovax",
        ownerJid: "2348077528901@s.whatsapp.net"
    },
    newsletter: {
        name: "CRYSNOVA AI V2",
        id: "0@newsletter"
    },
    api: {
        baseurl: "https://hector-api.vercel.app/",
        apikey: "hector",
        groq: process.env.GROQ_API_KEY || ""
    },
    sticker: {
        packname: "CRYSNOVA AI V2",
        author: "CRYSN⚉VA"
    }
};

module.exports = config;

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});
