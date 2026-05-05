const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'json',
    alias: ['jsong', 'jsonformat', 'jsonfile'],
    category: 'Documents',
    desc: 'Create or format a JSON file',
    usage: '.json key:value key2:value2',

    execute: async (sock, m, { args, reply }) => {
        const text = args.join(' ').trim();
        if (!text) return reply('⚉ Usage: .json name:John age:25 city:Lagos');

        // Parse key:value pairs
        const obj = {};
        const pairs = text.match(/(\w+):("[^"]*"|\S+)/g);
        
        if (!pairs) {
            // Try parsing as raw JSON
            try {
                const parsed = JSON.parse(text);
                const formatted = JSON.stringify(parsed, null, 2);
                
                const tempDir = path.join(__dirname, '../../temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                const filePath = path.join(tempDir, `data_${Date.now()}.json`);
                fs.writeFileSync(filePath, formatted);

                await sock.sendMessage(m.chat, {
                    document: fs.readFileSync(filePath),
                    fileName: 'data.json',
                    mimetype: 'application/json',
                    caption: '# JSON File'
                }, { quoted: m });
                fs.unlinkSync(filePath);
                return;
            } catch (e) {}
            return reply('_*⚉ Format: key:value pairs or valid JSON*_');
        }

        pairs.forEach(pair => {
            const [key, ...val] = pair.split(':');
            let value = val.join(':');
            // Convert numbers
            if (/^\d+$/.test(value)) value = parseInt(value);
            else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
            else if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (value === 'null') value = null;
            else value = value.replace(/^"|"$/g, '');
            obj[key] = value;
        });

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `data_${Date.now()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: 'data.json',
            mimetype: 'application/json',
            caption: '# JSON Created'
        }, { quoted: m });

        fs.unlinkSync(filePath);
    }
};
