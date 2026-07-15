const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ssd',
    alias: ['secureservice', 'ssdon', 'ssdoff'],
    desc: 'Toggle Meta Secure Server-side Data service',
    category: 'Owner',
    reactions: { start: '🔒', success: '✅' },
    ownerOnly: true,
    groupOnly: false,

    execute: async (sock, m, { args, reply }) => {
        try {
            const mainFile = path.join(__dirname, '../../?.js');
            
            if (!fs.existsSync(mainFile)) {
                return reply('⚠ Main file not found');
            }

            let content = fs.readFileSync(mainFile, 'utf8');
            
            // Check current state
            const isCurrentlyEnabled = /content\.secureMetaServiceLabel\s*=\s*true/.test(content);
            
            // Toggle: if enabled, set to false; if disabled, set to true
            if (isCurrentlyEnabled) {
                // Turn OFF
                content = content.replace(
                    /content\.secureMetaServiceLabel\s*=\s*true/g,
                    'content.secureMetaServiceLabel = false'
                );
                fs.writeFileSync(mainFile, content, 'utf8');
                return reply('🔒 *SSD:* Toggled *OFF*');
            } else {
                // Turn ON
                content = content.replace(
                    /content\.secureMetaServiceLabel\s*=\s*false/g,
                    'content.secureMetaServiceLabel = true'
                );
                // If line doesn't exist, add it
                if (!content.includes('content.secureMetaServiceLabel')) {
                    content = content.replace(
                        /content\.ai\s*=\s*true/,
                        'content.ai = true;\n        content.secureMetaServiceLabel = true'
                    );
                }
                fs.writeFileSync(mainFile, content, 'utf8');
                return reply('🔒 *SSD:* Toggled *ON*');
            }
        } catch (err) {
            console.error('[SSD ERROR]', err);
            reply('⚠ Error toggling SSD');
        }
    }
};
