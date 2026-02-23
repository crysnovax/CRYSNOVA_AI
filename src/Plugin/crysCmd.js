const registry = new Map();

/* Add command */
const addCommand = (cmd) => {
    if (!cmd?.name) return;

    registry.set(cmd.name.toLowerCase(), cmd);

    if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) {
            registry.set(a.toLowerCase(), cmd);
        }
    }
};

/* Clear registry */
const clearRegistry = () => registry.clear();

/* Get command */
const getCommand = (name) =>
    registry.get(name?.toLowerCase());

/* Get all commands */
const getAll = () => registry;

/* ⭐ Category grouping (FIXED) */
const getByCategory = () => {
    const categories = {};

    for (const [, cmd] of registry) {

        if (cmd?.isAlias) continue;

        const cat = cmd.category || 'General';

        if (!categories[cat]) categories[cat] = [];

        categories[cat].push(cmd);
    }

    return categories;
};

module.exports = {
    addCommand,
    clearRegistry,
    getCommand,
    getAll,
    getByCategory
};
