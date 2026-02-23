// CRYSNOVA COMMAND AUTO LOADER

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { addCommand, clearRegistry } = require('./crysCmd');

const loadCommands = () => {

    clearRegistry();

    const cmdPath = path.join(__dirname, '../Commands');

    if (!fs.existsSync(cmdPath)) {
        console.log(chalk.red("❌ Commands folder not found"));
        return 0;
    }

    let total = 0;

    const categories = fs.readdirSync(cmdPath);

    for (const cat of categories) {

        const catPath = path.join(cmdPath, cat);

        if (!fs.statSync(catPath).isDirectory()) continue;

        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));

        for (const file of files) {

            try {

                const cmd = require(path.join(catPath, file));

                delete require.cache[require.resolve(path.join(catPath, file))];

                cmd.category = cat;

                addCommand(cmd);

                total++;

            } catch (err) {
                console.log(chalk.red(`[CMD ERROR] ${file}: ${err.message}`));
            }
        }
    }

    console.log(chalk.green(`✅ Reloaded ${total} commands`));

    return total;
};

module.exports = { loadCommands };