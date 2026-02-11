
// © 2025 Debraj. All Rights Reserved.
// respect the work, don’t just copy-paste.

const {
    jidNormalizedUser,
    proto,
    getContentType,
    areJidsSameUser
} = require("@whiskeysockets/baileys")

const smsg = async (sock, m, store) => {
    if (!m) return m
    
    let M = proto.WebMessageInfo
    
    if (m.key) {
        m.id = m.key.id
        m.from = m.key.remoteJid.startsWith('status') ? jidNormalizedUser(m.key?.participant || m.participant) : jidNormalizedUser(m.key.remoteJid);
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = sock.decodeJid(m.key.participant) || ''
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            
            if (typeof m.quoted === 'string') {
                m.quoted = {
                    text: m.quoted
                }
            }
 
            m.quoted.key = {
                remoteJid: m.msg?.contextInfo?.remoteJid || m.from,
                participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
                fromMe: areJidsSameUser(jidNormalizedUser(m.msg?.contextInfo?.participant), jidNormalizedUser(sock?.user?.id)),
                id: m.msg?.contextInfo?.stanzaId,
            };
            
            m.quoted.mtype = type
            m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid) ? m.quoted.key.participant : m.quoted.key.remoteJid;
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = sock.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await store.loadMessage(m.chat, m.quoted.id, sock)
                return smsg(sock, q, store)
            }
            
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })

            m.quoted.delete = () => sock.sendMessage(m.quoted.chat, { 
                delete: vM.key 
            })

            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => 
                sock.copyNForward(jid, vM, forceForward, options)

            m.quoted.download = () => sock.downloadMediaMessage(m.quoted)
        }
    }
    
    if (m.msg && m.msg.url) {
        m.download = () => sock.downloadMediaMessage(m.msg)
    }
    
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''
    
    m.reply = (text, chatId = m.chat, options = {}) => 
        Buffer.isBuffer(text) ? 
        sock.sendMedia(chatId, text, 'file', '', m, { ...options }) : 
        sock.sendText(chatId, text, m, { ...options })
    
    m.copy = () => smsg(sock, M.fromObject(M.toObject(m)))

    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => 
        sock.copyNForward(jid, m, forceForward, options)

    return m
}

module.exports = { smsg }