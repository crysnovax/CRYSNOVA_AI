const axios = require('axios');

// Book name mappings
const BOOK_MAP = {
    'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers',
    'deut': 'Deuteronomy', 'josh': 'Joshua', 'judg': 'Judges', 'ruth': 'Ruth',
    '1sam': '1 Samuel', '2sam': '2 Samuel', '1kgs': '1 Kings', '2kgs': '2 Kings',
    '1chr': '1 Chronicles', '2chr': '2 Chronicles', 'ezra': 'Ezra', 'neh': 'Nehemiah',
    'esth': 'Esther', 'job': 'Job', 'ps': 'Psalms', 'prov': 'Proverbs',
    'eccl': 'Ecclesiastes', 'song': 'Song of Solomon', 'isa': 'Isaiah', 'jer': 'Jeremiah',
    'lam': 'Lamentations', 'ezek': 'Ezekiel', 'dan': 'Daniel', 'hos': 'Hosea',
    'joel': 'Joel', 'amos': 'Amos', 'obad': 'Obadiah', 'jonah': 'Jonah',
    'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk', 'zeph': 'Zephaniah',
    'hag': 'Haggai', 'zech': 'Zechariah', 'mal': 'Malachi',
    'matt': 'Matthew', 'mark': 'Mark', 'luke': 'Luke', 'john': 'John',
    'acts': 'Acts', 'rom': 'Romans', '1cor': '1 Corinthians', '2cor': '2 Corinthians',
    'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians', 'col': 'Colossians',
    '1thess': '1 Thessalonians', '2thess': '2 Thessalonians', '1tim': '1 Timothy',
    '2tim': '2 Timothy', 'titus': 'Titus', 'philem': 'Philemon', 'heb': 'Hebrews',
    'jas': 'James', '1pet': '1 Peter', '2pet': '2 Peter', '1john': '1 John',
    '2john': '2 John', '3john': '3 John', 'jude': 'Jude', 'rev': 'Revelation'
};

function parseReference(text) {
    // Support: "John 3:16", "john 3 16", "ps 23 1"
    const parts = text.trim().split(/\s+/);
    
    if (parts.length < 2) return null;
    
    // Find where numbers start
    let bookEnd = 0;
    for (let i = 0; i < parts.length; i++) {
        if (/^\d/.test(parts[i]) || parts[i].includes(':')) {
            bookEnd = i;
            break;
        }
        bookEnd = i + 1;
    }
    
    let book = parts.slice(0, bookEnd).join('').toLowerCase();
    const reference = parts.slice(bookEnd).join('');
    
    // Parse chapter:verse
    const match = reference.match(/(\d+)[:\s](\d+)/);
    if (!match) return null;
    
    const chapter = parseInt(match[1]);
    const verse = parseInt(match[2]);
    
    // Map short names to full
    const fullBook = BOOK_MAP[book] || book.charAt(0).toUpperCase() + book.slice(1);
    
    return { book: book, fullBook, chapter, verse };
}

module.exports = {
    name: 'bible',
    alias: ['verse', 'scripture', 'bibleverse'],
    desc: 'Get Bible verses in premium format',
    category: 'Search',
    usage: '.bible John 3:16 | .bible ps 23 1',
    reactions: { start: '📖', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const text = args.join(' ').trim();
        
        if (!text) {
            return reply(
                `╭─❍ *BIBLE VERSE*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}bible <reference>\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}bible John 3:16\n` +
                `│ ${prefix}bible ps 23 1\n` +
                `│ ${prefix}bible matt 5 14\n│\n` +
                `│ 📖 *Holy Bible (KJV)*\n` +
                `╰──────────────────`
            );
        }

        const ref = parseReference(text);
        if (!ref) return reply('`✘ Invalid format. Use: John 3:16 or ps 23 1`');

        await sock.sendMessage(m.chat, { react: { text: '📖', key: m.key } });

        try {
            const res = await axios.get('https://bible-api.com/' + encodeURIComponent(`${ref.book}+${ref.chapter}:${ref.verse}`), {
                params: { translation: 'kjv' },
                timeout: 10000,
                headers: { 'Accept': 'application/json' }
            });

            const data = res.data;

            if (!data?.verses?.length) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply(`\`✘ Verse not found: ${ref.fullBook} ${ref.chapter}:${ref.verse}\``);
            }

            const verse = data.verses[0];
            const verseText = verse.text.replace(/\n/g, ' ').trim();

            await sock.sendMessage(m.chat, {
                headerText: `## 📖 ${data.reference}`,
                contentText: '---',
                title: '🙏 Holy Bible (KJV)',
                table: [
                    ['📖 Book', ref.fullBook],
                    ['📜 Chapter', ref.chapter],
                    ['📍 Verse', ref.verse],
                    ['📝 Text', verseText]
                ],
                footerText: '💡 SWIPE ⇆ • Use .bible <ref> for more verses'
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (error) {
            console.error('[BIBLE ERROR]', error.message);
            await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
            reply('`✘ Failed to fetch verse. Check reference and try again.`');
        }
    }
};
