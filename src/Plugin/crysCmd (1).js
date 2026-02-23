const registry = new Map();

/* Add command (Singleton Safe) */
const addCommand = (cmd) => {
    if (!cmd?.name) return;

    const name = cmd.name.toLowerCase();

    // Prevent duplicate command registration
    if (registry.has(name)) return;

    registry.set(name, cmd);

    // Register aliases safely
    if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) {
            const alias = a.toLowerCase();

            if (!registry.has(alias)) {
                registry.set(alias, cmd);
            }
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

/* Category grouping */
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