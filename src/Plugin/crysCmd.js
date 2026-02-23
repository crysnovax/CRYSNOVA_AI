// CRYSNOVA COMMAND REGISTRY (Stable Version)

const registry = new Map();

/* Add command */
const addCommand = (cmd) => {
    if (!cmd?.name) return;

    registry.set(cmd.name.toLowerCase(), cmd);

    if (cmd.alias) {
        for (const a of cmd.alias) {
            registry.set(a.toLowerCase(), cmd);
        }
    }
};

/* Clear registry (for reload) */
const clearRegistry = () => {
    registry.clear();
};

/* Get command */
const getCommand = (name) => {
    if (!name) return null;
    return registry.get(name.toLowerCase());
};

/* Get all commands */
const getAllCommands = () => registry;

module.exports = {
    addCommand,
    clearRegistry,
    getCommand,
    getAllCommands
};