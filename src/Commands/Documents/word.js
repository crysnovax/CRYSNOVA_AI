const fs = require('fs')
const path = require('path')
const { Packer, Document, Paragraph, TextRun } = require('docx')

module.exports = {
    name: 'word',
    alias: ['docx', 'toword', 'text2docx'],
    category: 'Documents',
    desc: 'Convert text to .docx document',

    execute: async (sock, m, { args, reply, prefix }) => {
        try {
            let text = ''

            // Get text from args
            if (args.length > 0) {
                text = args.join(' ')
            }

            // Or fallback to quoted message text
            if (!text && m.quoted) {
                text = (m.quoted.text || m.quoted.caption || '').trim()
            }

            if (!text) {
                return reply(
                    `⚉ Provide text or reply to a message!\n` +
                    `Example: ${prefix}word Hello this is my document\n` +
                    `Or reply to text → ${prefix}word`
                )
            }

            // Limit length (Word files can handle a lot, but safety)
            if (text.length > 10000) {
                text = text.substring(0, 9997) + '...'
            }

            await reply('_✦ Creating .docx document..._')

            // Create simple DOCX
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: text,
                                    size: 24, // 12pt
                                    font: 'Arial'
                                })
                            ]
                        })
                    ]
                }]
            })

            // Generate buffer
            const buffer = await Packer.toBuffer(doc)

            const fileName = `document_${Date.now()}.docx`

            await sock.sendMessage(m.chat, {
                document: buffer,
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                fileName: fileName,
                caption: `_*𓉤 .docx file created*_\n_*Text length:*_ ${text.length} chars`
            }, { quoted: m })

            reply('_*✦ Sent as Word document! Tap to download/open.*_')

        } catch (e) {
            console.log('[WORD ERROR]', e.message)
            reply('✘ Failed to create .docx document')
        }
    }
}