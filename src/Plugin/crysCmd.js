const registry = new Map();

/* Add command (Singleton Safe) */
const addCommand = (cmd) => {
    if (!cmd?.name || typeof cmd.execute !== 'function') return false;

    const name = cmd.name.toLowerCase();

    if (registry.has(name)) {
        console.warn(`[CMD COLLISION] "${name}" is already registered; skipping duplicate`);
        return false;
    }

    registry.set(name, cmd);

    // Register aliases safely
    if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) {
            if (typeof a !== 'string' || !a.trim()) continue;
            const alias = a.toLowerCase();

            if (!registry.has(alias)) {
                registry.set(alias, cmd);
            } else if (registry.get(alias) !== cmd) {
                console.warn(`[CMD COLLISION] alias "${alias}" for "${name}" is already registered`);
            }
        }
    }

    return true;
};

/* Register external/dynamic command (public API for plugins) */
const registerCommand = (cmd) => {
    if (!cmd?.name) return false;

    const name = cmd.name.toLowerCase();

    // Allow overwriting for plugin updates
    registry.set(name, cmd);

    // Register aliases
    if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) {
            const alias = a.toLowerCase();
            registry.set(alias, cmd);
        }
    }

    return true;
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
    registerCommand,
    clearRegistry,
    getCommand,
    getAll,
    getByCategory
};
