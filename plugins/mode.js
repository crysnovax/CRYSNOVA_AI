module.exports = {
    command: 'mode',
    description: 'Toggle public/private mode',
    category: 'owner',
    
    execute: async (sock, m, { args, reply, isCreator }) => {
        if (!isCreator) {
            return reply('✘ Owner only command');
        }
        
        const mode = args[0]?.toLowerCase();
        
        if (mode === 'public') {
            sock.public = true;
            return reply(
                `🌍 *PUBLIC MODE ACTIVATED*\n\n` +
                `✘ Bot now responds to everyone`
            );
        }
        
        if (mode === 'private' || mode === 'self') {
            sock.public = false;
            return reply(
                `𓉤 *PRIVATE MODE ACTIVATED*\n\n` +
                `⚉ Bot now only responds to you`
            );
        }
        
        // Show current status
        const status = sock.public ? '🌍 Public' : '𓄄 Private';
        return reply(
            `*CURRENT MODE*\n\n` +
            `Status: ${status}\n\n` +
            `*Commands:*\n` +
            `.mode public  → Everyone can use\n` +
            `.mode private → Owner only`
        );
    }
};
