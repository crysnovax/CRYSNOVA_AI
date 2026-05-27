// Stores last deleted message per chat
const deletedMessages = new Map();

const onDelete = async (sock, updates, customStore) => {
    for (const update of updates) {
        try {
            if (!update.key?.remoteJid || !update.key?.id) continue;

            // Check if this is a delete (message revoked)
            if (!update.update?.message || update.update.message === null) {
                const storeKey = update.key.remoteJid + ':' + update.key.id;
                const stored = customStore?.messages?.get(storeKey);
                if (!stored?.message) continue;

                // Save as last deleted for this chat
                deletedMessages.set(update.key.remoteJid, {
                    message: stored.message,
                    timestamp: Date.now()
                });
            }
        } catch (err) {
            console.error('[QUOTED DELETE]', err.message);
        }
    }
};

const getLastDeleted = (jid) => deletedMessages.get(jid) || null;

const cleanUp = () => {
    const now = Date.now();
    const TTL = 48 * 60 * 60 * 1000;
    for (const [jid, data] of deletedMessages.entries()) {
        if (now - data.timestamp > TTL) deletedMessages.delete(jid);
    }
};

module.exports = { onDelete, getLastDeleted, cleanUp };
