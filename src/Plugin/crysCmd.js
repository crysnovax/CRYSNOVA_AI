/**
 * CRYSNOVA AI V2.0 - Command Registry (Kord-style)
 */

const commands = new Map();

const addCommand = (cmd) => {
    if (!cmd.name) return;
    commands.set(cmd.name.toLowerCase(), cmd);
    if (cmd.alias) {
        for (const a of cmd.alias) {
            commands.set(a.toLowerCase(), { ...cmd, isAlias: true });
        }
    }
};

const getCommand = (name) => commands.get(name.toLowerCase());

const getAll = () => commands;

const getByCategory = () => {
    const cats = {};
    for (const [, cmd] of commands) {
        if (cmd.isAlias) continue;
        const cat = cmd.category || 'General';
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
    }
    return cats;
};

module.exports = { addCommand, getCommand, getAll, getByCategory };
