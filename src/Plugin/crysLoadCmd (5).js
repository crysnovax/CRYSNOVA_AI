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

                // Prevent same file loading twice in one cycle
                if (loadedFiles.has(resolvedPath)) continue;
                loadedFiles.add(resolvedPath);

                // FIX: delete cache BEFORE require so reload always
                // picks up the latest version of the file on disk
                delete require.cache[resolvedPath];

                const cmd = require(filePath);

                cmd.category = cat;

                addCommand(cmd);

                total++;

            } catch (err) {
                console.log(chalk.red(`[CMD ERROR] ${file}: ${err.message}`));
            }
        }
    }

    console.log(chalk.green(`✅ Loaded ${total} commands`));

    return total;
};

module.exports = { loadCommands };
