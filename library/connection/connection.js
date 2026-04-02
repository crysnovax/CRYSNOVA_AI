
// © 2026 CRYSNOVA. All Rights Reserved.
// respect the work, don't just copy-paste.

const chalk = require("chalk")

module.exports = {
    konek: async ({ sock, update, clientstart, DisconnectReason, Boom }) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

            if (reason === DisconnectReason.loggedOut) {
                // Only hard-exit on actual logout — session is truly dead
                console.log(chalk.bold.red('🚫 Logged out. Delete session folder and restart.'));
                process.exit(1);
            }

            if (reason === DisconnectReason.connectionReplaced) {
                // Another instance opened — exit so PM2/Pterodactyl restarts once cleanly
                console.log(chalk.bold.red('⚠️ Connection replaced. Exiting...'));
                process.exit(1);
            }

            if (reason === DisconnectReason.badSession) {
                console.log(chalk.bold.red('❌ Bad session. Delete session folder and re-pair.'));
                process.exit(1);
            }

            // All other reasons (timeout, closed, lost, restartRequired, unknown)
            // are already handled by index.js setTimeout(clientstart, 3000)
            // DO NOT call clientstart() here — causes double-instance → connectionReplaced loop
            console.log(chalk.yellow(`🔄 Disconnected (code: ${reason}) — reconnecting in 3s...`));

        } else if (connection === "open") {
            console.log(chalk.bold.green('✓ Bot connected successfully'));
        }
    }
}
