// ZEE BOT V2 — Sudo Management
const { getVar, setVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'sudo',
    alias: ['addsudo', 'delsudo', 'sudolist'],
    desc: 'Manage sudo users (trusted users with near-owner access)',
    category: 'Owner',
    ownerOnly: true,  // Only the REAL owner can manage sudo
    reactions: { start: '👑', success: '🌟' },

    execute: async (sock, m, { args, reply }) => {
        const sub     = args[0]?.toLowerCase();
        const current = String(getVar('SUDO_NUMBERS') || '');
        const list    = current ? current.split(',').map(n => n.trim()).filter(Boolean) : [];

        // .sudo list
        if (!sub || sub === 'list') {
            if (!list.length) return reply('📋 No sudo users set.\n\nUse:\n• .sudo add <number>\n• .sudo del <number>');
            return reply(`亗 *Sudo Users:*\n${list.map((n, i) => `${i + 1}. +${n}`).join('\n')}\n\n_These users have near-owner access_`);
        }

        // .sudo add <number>
        if (sub === 'add') {
            const num = (args[1] || '').replace(/[^0-9]/g, '');
            if (!num) return reply('Usage: .sudo add <number without +>');
            if (list.includes(num)) return reply(`_*𓉤 ${num} is already a sudo user*_`);
            list.push(num);
            setVar('SUDO_NUMBERS', list.join(','));
            return reply(`_*☬ Added*_ _*${num}*_ _*to sudo users*_\n_They can now use owner-restricted commands_`);
        }

        // .sudo del / remove
        if (sub === 'del' || sub === 'remove') {
            const num = (args[1] || '').replace(/[^0-9]/g, '');
            if (!num) return reply('Usage: .sudo del <number without +>');
            const updated = list.filter(n => n !== num);
            if (updated.length === list.length) return reply(`_*𓉤 ${num} is not a sudo user*_`);
            setVar('SUDO_NUMBERS', updated.join(','));
            return reply(`🗑️ Removed *${num}* from sudo users`);
        }

        // .sudo clear
        if (sub === 'clear') {
            setVar('SUDO_NUMBERS', '');
            return reply('_*🗑️ All sudo users cleared*_');
        }

        reply('📋 *Sudo Commands:*\n• .sudo list\n• .sudo add <number>\n• .sudo del <number>\n• .sudo clear');
    }
};
