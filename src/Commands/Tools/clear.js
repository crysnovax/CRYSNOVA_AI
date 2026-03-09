module.exports = {
  name: 'clearchat',
  alias: ['clear', 'clr','wipe'],
  category: 'tools',
  desc: 'Wipe chat then start a new thread with status',
   // ⭐ Reaction config
    reactions: {
        start: '🧹',
        success: '✨'
    },
    
  execute: async (sock, m) => {
    try {
      if (!m.key.fromMe) return; 

     
      await sock.chatModify({
        delete: true,
        lastMessages: [{ 
          key: m.key, 
          messageTimestamp: m.messageTimestamp 
        }]
      }, m.chat);
      await new Promise(resolve => setTimeout(resolve, 2000));

      
      await sock.sendMessage(m.chat, { 
        text: '✦ _*clean*_' 
      });

    } catch (err) {
      console.error("Wipe Logic Error:", err);
    }
  }
};
