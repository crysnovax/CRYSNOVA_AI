const { createAccessListCommand } = require('../../Plugin/accessListManager');

module.exports = createAccessListCommand({
    name: 'sudo',
    aliases: ['addsudo', 'delsudo', 'sudolist'],
    variable: 'SUDO_NUMBERS',
    description: 'Manage sudo users (trusted users with near-owner access)',
    accessDescription: 'These users have near-owner access.'
});
