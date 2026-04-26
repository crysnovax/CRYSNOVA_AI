const fs = require('fs');
const path = require('path');

function getConfig(groupId) {
    try {
        const dbPath = path.join(process.cwd(), 'database/groupEvents.json');
        if (!fs.existsSync(dbPath)) return null;
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'))[groupId] || null;
    } catch { return null; }
}

function patchGroupEvents(sock) {
    const original = sock.sendMessage.bind(sock);
    
    sock.sendMessage = async function(jid, content, options) {
        if (jid && jid.endsWith('@g.us')) {
            const config = getConfig(jid);
            if (config) {
                const text = content?.text || content?.caption || '';
                
                if ((text.includes('Welcome') || text.includes('Hello @') || text.includes('joined')) 
                    && config.welcomeEnabled === false) {
                    console.log('[PATCH] Welcome blocked');
                    return null;
                }
                
                if ((text.includes('left') || text.includes('Goodbye') || text.includes('removed')) 
                    && config.goodbyeEnabled === false) {
                    console.log('[PATCH] Goodbye blocked');
                    return null;
                }
            }
        }
        return original(jid, content, options);
    };
}

module.exports = { patchGroupEvents };