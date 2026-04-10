/**
 * CRYSNOVA AI V2 – Entry Point
 * ⓘ ©crysnovax all right reserved!.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // Make sure chalk is installed: npm install chalk

// -------------------------------------------------------------------
// 1. Check if auto‑update is enabled
// -------------------------------------------------------------------
const CONFIG_PATH = path.join(process.cwd(), 'database', 'autoupdate.json');
let autoUpdateEnabled = false;

try {
    if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        autoUpdateEnabled = config.enabled === true;
    }
} catch (err) {
    console.error(chalk.red('[AUTO-UPDATE] Failed to read config:'), err.message);
}

// -------------------------------------------------------------------
// 2. If enabled, run the update in the background (non‑blocking)
// -------------------------------------------------------------------
if (autoUpdateEnabled) {
    console.log(chalk.yellow('𝌆  updating...ⓘ'));
    console.log(chalk.cyan('⎙ [CRYSNOVA] —͟͟͞͞𖣘❚ Starting background update...'));

    const { performUpdate } = require('./src/Plugin/updater.js');

    // Fire and forget – update runs in the background
    performUpdate({
        notifyOwner: null
    }).then(result => {
        if (result.success) {
            console.log(chalk.green('✓ [CRYSNOVA] Background update completed successfully.'));
            console.log(chalk.cyan('⎙ [CRYSNOVA] —͟͟͞͞𖣘❚ Restart the bot to apply changes.'));
        } else {
            console.log(chalk.red('✘ [CRYSNOVA] Background update failed:'), result.error);
        }
    }).catch(err => {
        console.error(chalk.red('✘ [CRYSNOVA] Background update error:'), err);
    });
} else {
    console.log(chalk.gray('ⓘ Auto‑update is disabled. Skipping.'));
}

// -------------------------------------------------------------------
// 3. Load and start the main (obfuscated) bot
// -------------------------------------------------------------------
console.log(chalk.cyan('⎙ [CRYSNOVA] —͟͟͞͞𖣘❚ Loading main bot...'));
require('./⚉.js');  // your obfuscated entry point
