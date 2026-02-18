
// © 202y CRYSNOVA. All Rights Reserved.
// respect the work, don’t just copy-paste.

const fs = require('fs')

const fquoted = {
    channel: {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "2348077528901@s.whatsapp.net"
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: "0@newsletter",
                newsletterName: " X ",
                caption: "CRYSNOVA BOT",
                inviteExpiration: "0"
            }
        }
    }
};

module.exports = { fquoted };

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})

