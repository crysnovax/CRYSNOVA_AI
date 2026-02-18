/**
 * CRYSNOVA AI V2.0 - Command Loader (Kord-style)
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { addCommand } = require('./crysCmd');

const loadCommands = () => {
    const cmdPath = path.join(__dirname, '../Commands');
    const categories = fs.readdirSync(cmdPath).filter(f =>
        fs.statSync(path.join(cmdPath, f)).isDirectory()
    );

    let total = 0;

    for (const cat of categories) {
        const files = fs.readdirSync(path.join(cmdPath, cat)).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                const cmd = require(path.join(cmdPath, cat, file));
                cmd.category = cat;
                addCommand(cmd);
                total++;
            } catch (err) {
                console.log(chalk.red(`[CMD ERROR] ${file}: ${err.message}`));
            }
        }
    }

    console.log(chalk.green(`✅ Loaded ${total} commands across ${categories.length} categories`));
    return total;
};

module.exports = { loadCommands };
