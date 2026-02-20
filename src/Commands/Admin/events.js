// © 2026 CRYSNOVA AI V2.0 - All Rights Reserved.

const fs = require('fs');
const path = './database/groupEvents.json';

if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}));

module.exports = {
    name: 'events',
    alias: [],
    desc: '⚉ Toggle Group Events System ⚉',
    category: 'group',
    group: true,
    admin: true, // Only group admins can use
    owner: true, // Not restricted to bot owner

    execute: async (sock, m, { reply }) => {
        try {
            const args = m.body.trim().split(/\s+/);
            const option = args[1]?.toLowerCase();

            const db = JSON.parse(fs.readFileSync(path));
            if (!db[m.chat]) db[m.chat] = { enabled: false, welcome: null, goodbye: null };

            if (!option) {
                return await reply(
`⚉ *GROUP EVENTS SYSTEM* ⚉

Usage:  
.events on  
.events off

Available Features:  
• Premium Welcome Card  
• Goodbye Messages  
• Editable Welcome Text  
• Member Count Display  
• Join Time Display  
• @User Tagging  
• Future: Online Tracker`
                );
            }

            if (option === 'on') {
                db[m.chat].enabled = true;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('✓ *Group Events Enabled Successfully!*𓄄');
            }

            if (option === 'off') {
                db[m.chat].enabled = false;
                fs.writeFileSync(path, JSON.stringify(db, null, 2));
                return await reply('✘ *Group Events Disabled!*⚉𓄄');
            }

            return await reply('✘ *Invalid option!* Use "on" or "off"𓄄');
        } catch (e) {
            console.error('Events Plugin Error:', e);
            return await reply('✘ *Something went wrong!*⚉𓄄');
        }
    }
};
