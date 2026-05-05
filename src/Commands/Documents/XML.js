const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'xml',
    alias: ['xmlgen', 'xmlfile'],
    category: 'Documents',
    desc: 'Generate an XML file',
    usage: '.xml root | child:value | child2:value2',

    execute: async (sock, m, { args, reply }) => {
        const input = args.join(' ').trim();
        if (!input) return reply('⚉ Usage: .xml rootname | key:value | key2:value2');

        const parts = input.split('|').map(p => p.trim());
        const rootName = parts[0] || 'root';
        const dataParts = parts.slice(1);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
        
        dataParts.forEach(pair => {
            const match = pair.match(/^(\w+):(.+)$/);
            if (match) {
                xml += `  <${match[1]}>${match[2].trim()}</${match[1]}>\n`;
            }
        });
        
        xml += `</${rootName}>`;

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `data_${Date.now()}.xml`);
        fs.writeFileSync(filePath, xml);

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: `${rootName}.xml`,
            mimetype: 'application/xml',
            caption: '@ XML Generated'
        }, { quoted: m });

        fs.unlinkSync(filePath);
    }
};
