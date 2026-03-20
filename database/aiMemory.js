// ZEE BOT V2 — Simple AI Memory Store
const store = new Map();
module.exports = {
    get: (id) => store.get(id) || [],
    set: (id, data) => store.set(id, data),
    clear: (id) => store.delete(id)
};

