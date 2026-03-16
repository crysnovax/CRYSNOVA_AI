/**
 * ╔══════════════════════════════════════════════════╗
 * ║    ADMIN HELPER - Consistent Admin Checks        ║
 * ║             © CRYSNOVA 2026                      ║
 * ╚══════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const SUDO_DB = path.join(__dirname, '../database/sudo.json');

/**
 * Load sudo database
 */
function loadSudo() {
    try {
        if (!fs.existsSync(SUDO_DB)) {
            fs.mkdirSync(path.dirname(SUDO_DB), { recursive: true });
            fs.writeFileSync(SUDO_DB, JSON.stringify({ users: [] }, null, 2));
            return { users: [] };
        }
        return JSON.parse(fs.readFileSync(SUDO_DB, 'utf8'));
    } catch {
        return { users: [] };
    }
}

/**
 * Check if user is bot owner
 * @param {string} jid - User JID
 * @param {function} config - Config function
 * @returns {boolean}
 */
function isOwner(jid, config) {
    try {
        const ownerJid = config().settings?.ownerJid || config().owner + '@s.whatsapp.net';
        const userNumber = jid.split('@')[0];
        const ownerNumber = ownerJid.split('@')[0];
        return userNumber === ownerNumber;
    } catch {
        return false;
    }
}

/**
 * Check if user is sudo
 * @param {string} jid - User JID
 * @returns {boolean}
 */
function isSudo(jid) {
    try {
        const db = loadSudo();
        const userNumber = jid.split('@')[0];
        return db.users.includes(userNumber);
    } catch {
        return false;
    }
}

/**
 * Check if user is owner OR sudo
 * @param {string} jid - User JID
 * @param {function} config - Config function
 * @returns {boolean}
 */
function isOwnerOrSudo(jid, config) {
    return isOwner(jid, config) || isSudo(jid);
}

/**
 * Check if user is group admin
 * @param {object} sock - WhatsApp socket
 * @param {string} chatId - Group JID
 * @param {string} userJid - User JID
 * @returns {Promise<boolean>}
 */
async function isGroupAdmin(sock, chatId, userJid) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participant = metadata.participants.find(p => p.id === userJid);
        if (!participant) return false;
        return participant.admin === 'admin' || participant.admin === 'superadmin';
    } catch {
        return false;
    }
}

/**
 * Check if bot is group admin
 * @param {object} sock - WhatsApp socket
 * @param {string} chatId - Group JID
 * @returns {Promise<boolean>}
 */
async function isBotAdmin(sock, chatId) {
    try {
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        return await isGroupAdmin(sock, chatId, botNumber);
    } catch {
        return false;
    }
}

/**
 * Get all sudo users
 * @returns {Array<string>}
 */
function getSudoList() {
    const db = loadSudo();
    return db.users || [];
}

/**
 * Add sudo user
 * @param {string} number - Phone number without @s.whatsapp.net
 * @returns {boolean}
 */
function addSudo(number) {
    try {
        const db = loadSudo();
        if (!db.users) db.users = [];
        if (db.users.includes(number)) return false;
        db.users.push(number);
        fs.writeFileSync(SUDO_DB, JSON.stringify(db, null, 2));
        return true;
    } catch {
        return false;
    }
}

/**
 * Remove sudo user
 * @param {string} number - Phone number without @s.whatsapp.net
 * @returns {boolean}
 */
function removeSudo(number) {
    try {
        const db = loadSudo();
        if (!db.users) return false;
        const index = db.users.indexOf(number);
        if (index === -1) return false;
        db.users.splice(index, 1);
        fs.writeFileSync(SUDO_DB, JSON.stringify(db, null, 2));
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    isOwner,
    isSudo,
    isOwnerOrSudo,
    isGroupAdmin,
    isBotAdmin,
    getSudoList,
    addSudo,
    removeSudo
};
