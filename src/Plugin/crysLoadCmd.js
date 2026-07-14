const fs    = require('fs');
const path  = require('path');
const chalk = require('chalk');

const { addCommand, clearRegistry } = require('./crysCmd');

const loadCommands = () => {

    clearRegistry();

    const cmdPath = path.join(__dirname, '../Commands');

    if (!fs.existsSync(cmdPath)) {
        console.log(chalk.red('❌ Commands folder not found'));
        return 0;
    }

    const loadedFiles = new Set();
    let total = 0;

    const categories = fs.readdirSync(cmdPath);

    for (const cat of categories) {

        const catPath = path.join(cmdPath, cat);

        if (!fs.statSync(catPath).isDirectory()) continue;

        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));

        for (const file of files) {

            try {

                const filePath     = path.join(catPath, file);
                const resolvedPath = require.resolve(filePath);

                if (loadedFiles.has(resolvedPath)) continue;
                loadedFiles.add(resolvedPath);

                delete require.cache[resolvedPath];

                const cmdModule = require(filePath);

                // ✅ Support both single object and array of commands
                const commandsArray = Array.isArray(cmdModule) ? cmdModule : [cmdModule];

                for (const cmd of commandsArray) {
                    if (!cmd || typeof cmd !== 'object') {
                        throw new TypeError('command export must be an object or array of objects');
                    }
                    if (typeof cmd.name !== 'string' || !cmd.name.trim()) {
                        throw new TypeError('command is missing a valid name');
                    }
                    if (typeof cmd.execute !== 'function') {
                        throw new TypeError(`command "${cmd.name}" is missing execute()`);
                    }
                    if (!cmd.category) cmd.category = cat;
                    if (addCommand(cmd)) total++;
                }

            } catch (err) {
            //    console.log(chalk.red(`[CMD ERROR] ${file}: ${err.message}`));
            }
        }
    }

    console.log(chalk.green(`✅ Loaded ${total} commands`));

    return total;
};

module.exports = { loadCommands };
