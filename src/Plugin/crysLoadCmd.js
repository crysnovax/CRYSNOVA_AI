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

    const loadedFiles = new Set();
    let total = 0;

    const categories = fs.readdirSync(cmdPath);

    for (const cat of categories) {

        const catPath = path.join(cmdPath, cat);

        if (!fs.statSync(catPath).isDirectory()) continue;

        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));

        for (const file of files) {

            try {

                const filePath = path.join(catPath, file);

                // ⭐ Prevent duplicate file loading
                if (loadedFiles.has(filePath)) continue;

                const cmd = require(filePath);
                loadedFiles.add(filePath);

                delete require.cache[require.resolve(filePath)];

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
