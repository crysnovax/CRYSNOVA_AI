const axios = require('axios');

// Book name mappings — including Roman numeral variants
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
    '2john': '2 John', '3john': '3 John', 'jude': 'Jude', 'rev': 'Revelation',
    // Roman numeral II = 2, III = 3
    'iitim': '2 Timothy', 'iiitim': '3 John', 'iijohn': '3 John',
    '1st': '1', '2nd': '2', '3rd': '3'
};

// Roman numeral converter
function normalizeRoman(str) {
    return str.toLowerCase()
        .replace(/^ii$/i, '2')
        .replace(/^iii$/i, '3')
        .replace(/^iv$/i, '4');
}

function parseReference(text) {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) return null;
    
    // Normalize first word if it's a Roman numeral
    parts[0] = normalizeRoman(parts[0]);
    
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
    
    // Parse chapter:verse or chapter:verse-range
    const match = reference.match(/(\d+)[:\s](\d+)(?:\s*-\s*(\d+))?/);
    if (!match) return null;
    
    const chapter = parseInt(match[1]);
    const verse = parseInt(match[2]);
    const endVerse = match[3] ? parseInt(match[3]) : null;
    
    const fullBook = BOOK_MAP[book] || book.charAt(0).toUpperCase() + book.slice(1);
    
    return { book, fullBook, chapter, verse, endVerse };
}

module.exports = {
    name: 'bible',
    alias: ['verse', 'scripture', 'bibleverse'],
    desc: 'Get Bible verses in premium format (with range support)',
    category: 'Search',
    usage: '.bible John 3:16 | .bible II Timothy 3:15-21 | .bible books',
    reactions: { start: '📖', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        const text = args.join(' ').trim().toLowerCase();
        
        if (!text) {
            return reply(
                `╭─❍ *BIBLE VERSE*\n│\n` +
                `│ ⚉ *Usage:* ${prefix}bible <reference>\n│\n` +
                `│ ✪ *Examples:*\n` +
                `│ ${prefix}bible John 3:16\n` +
                `│ ${prefix}bible ps 23 1-3\n` +
                `│ ${prefix}bible II Timothy 3:15-21\n` +
                `│ ${prefix}bible books\n│\n` +
                `│ 📖 *Holy Bible (KJV)*\n` +
                `╰──────────────────`
            );
        }

        // ── LIST BOOKS ───────────────────────────────────────
        if (text === 'books' || text === 'list') {
            const books = Object.entries(BOOK_MAP)
                .filter(([k]) => !k.includes('iitim') && !k.includes('iiitim') && !k.includes('1st') && k.length <= 5)
                .map(([, name]) => name);

            const tableData = [['📖 Book', '📖 Book']];
            for (let i = 0; i < books.length; i += 2) {
                tableData.push([books[i] || '', books[i + 1] || '']);
            }

            await sock.sendMessage(m.chat, {
                headerText: `## 📖 Books of the Bible`,
                contentText: '---',
                title: '📜 All 66 Books',
                table: tableData,
                footerText: `💡 Use ${prefix}bible <book> <ch:vs> for verses`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✨', key: m.key } });
            return;
        }

        const ref = parseReference(text);
        if (!ref) return reply('`✘ Invalid format. Use: John 3:16 or II Timothy 3:15-21`');

        await sock.sendMessage(m.chat, { react: { text: '📖', key: m.key } });

        try {
            let referenceStr;
            if (ref.endVerse && ref.endVerse !== ref.verse) {
                referenceStr = `${ref.book}+${ref.chapter}:${ref.verse}-${ref.endVerse}`;
            } else {
                referenceStr = `${ref.book}+${ref.chapter}:${ref.verse}`;
            }

            const res = await axios.get(`https://bible-api.com/${encodeURIComponent(referenceStr)}`, {
                params: { translation: 'kjv' },
                timeout: 10000,
                headers: { 'Accept': 'application/json' }
            });

            const data = res.data;

            if (!data?.verses?.length) {
                await sock.sendMessage(m.chat, { react: { text: '❔', key: m.key } });
                return reply(`\`✘ Verse not found: ${ref.fullBook} ${ref.chapter}:${ref.verse}${ref.endVerse ? '-' + ref.endVerse : ''}\``);
            }

            let versesText = '';
            for (const v of data.verses) {
                versesText += `*${v.verse}* ${v.text.replace(/\n/g, ' ').trim()}\n\n`;
            }
            versesText = versesText.trim();

            const tableData = [
                ['📖 Book', ref.fullBook],
                ['📜 Chapter', ref.chapter],
                ['📍 Verse' + (ref.endVerse ? 's' : ''), ref.endVerse ? `${ref.verse}-${ref.endVerse}` : ref.verse],
                ['📝 Text', versesText]
            ];

            await sock.sendMessage(m.chat, {
                headerText: `## 📖 ${data.reference || `${ref.fullBook} ${ref.chapter}:${ref.verse}${ref.endVerse ? '-' + ref.endVerse : ''}`}`,
                contentText: '---',
                title: '🙏 Holy Bible (KJV)',
                table: tableData,
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
