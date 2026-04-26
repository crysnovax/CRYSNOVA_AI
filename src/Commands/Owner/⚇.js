const { setVar, getVar } = require('../../Plugin/configManager');

module.exports = {
    name: 'toggleprivate',
    alias: ['privatereact', 'prreact'],
    desc: 'Toggle private mode rejection react (⚉) on/off',
    category: 'Owner',
    ownerOnly: true,

    execute: async (sock, m, { args, reply }) => {
        const current = getVar('PRIVATE_REACT', true);
        const newVal = args[0]?.toLowerCase() === 'on' ? true 
                     : args[0]?.toLowerCase() === 'off' ? false 
                     : !current;
        
        setVar('PRIVATE_REACT', newVal);
        return reply(`_rejection:_ ${newVal ? '_ON_' : '_OFF_'}`);
    }
};
