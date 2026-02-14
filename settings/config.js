
// 漏 2026 CRYSNOVA. All Rights Reserved.
// respect the work, don鈥檛 just copy-paste.

const fs = require('fs')

const config = {
    owner: "-",
    botNumber: "-",
    setPair: "K0MRAID1",
    thumbUrl: "https://i.ibb.co/pBrzZDQj/20260212-111751.jpg",
    session: "sessions",
    status: {
        public: false,
        terminal: true,
        reactsw: false
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
        title: "crysn⚉va wa bot",
        packname: 'CRYSNOVA',
        description: "this script was created by crysnova ☠️",
        author: 'https://github.com/crysnovax/CRYSNOVA_AI',
        footer: "饾棈饾柧饾梾饾柧饾梹饾棆饾柡饾梿: @crysnovax"
    },
    newsletter: {
        name: "crysnova WA Base Bot",
        id: "0@newsletter"
    },
    api: {
        baseurl: "https://hector-api.vercel.app/",
        apikey: "hector"
    },
    sticker: {
        packname: "crysnova() WA Base Bot",
        author: "CRYSN⚉VA"
    }
}

module.exports = config;

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})
