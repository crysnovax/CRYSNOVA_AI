const { createAccessListCommand } = require('../../Plugin/accessListManager');

module.exports = createAccessListCommand({
    name: 'dual',
    aliases: ['adddual', 'deldual', 'duallist'],
    variable: 'DUAL_NUMBERS',
    description: 'Manage dual users (full owner-level access)',
    accessDescription: 'These users have full owner-level access.'
});
