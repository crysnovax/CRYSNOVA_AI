const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'togglereact',
    alias: ['cmdreact', 'reactionmode'],
    desc: 'Toggle command reactions (✨🥏) on/off',
    category: 'Owner',
    ownerOnly: true,

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('AUTO_REACT', true);
        const newVal = args[0]?.toLowerCase() === 'on' ? true 
                     : args[0]?.toLowerCase() === 'off' ? false 
                     : !current;
        
        setVar('AUTO_REACT', newVal);
        return reply(`_reactions ✨:_ ${newVal ? '_ON_' : '_OFF_'}`);
    }
};
