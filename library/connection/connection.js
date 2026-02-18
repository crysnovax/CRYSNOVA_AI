
// © 2025 Debraj. All Rights Reserved.
// respect the work, don’t just copy-paste.
 
const chalk = require("chalk")

module.exports = {
    konek: async ({ sock, update, clientstart, DisconnectReason, Boom }) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.badSession) {
                console.log(chalk.bold.red(`bad session file, please delete session and scan again`))
                process.exit();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.bold.red("connection closed, reconnecting...."))
                clientstart();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.bold.red("connection lost from server, reconnecting..."))
                clientstart();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.bold.red("connection replaced, another new session opened, please restart bot"))
                process.exit();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.bold.red(`device loggedout, please delete folder session and scan again.`))
                process.exit();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.bold.red("restart required, restarting..."))
                clientstart();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(chalk.bold.red("connection timedout, reconnecting..."))
                clientstart();
            } else {
                console.log(chalk.bold.red(`unknown disconnectReason: ${reason}|${connection}`))
                clientstart();
            }
        } else if (connection === "open") {
            console.log(chalk.bold.green('successfully connected to bot'))
        }
    }
              }
