// ── CRYSNOVA AI V3 FONTS PLUGIN ──
// 100+ Unicode fonts for stylish text

const fs = require('fs');
const path = require('path');

// Font storage path
const FONTS_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(FONTS_DIR, 'font-settings.json');

// Ensure data directory exists
if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Load bot font settings
let botFontSettings = {};
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        botFontSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch {
        botFontSettings = {};
    }
}

function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(botFontSettings, null, 2));
}

// ── 100+ UNICODE FONTS ──
const fonts = {
    // Script/Cursive
    1: { name: 'Script', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫' },
    2: { name: 'Bold Script', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    
    // Double-struck
    3: { name: 'Double-Struck', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡' },
    
    // Fraktur/Gothic
    4: { name: 'Fraktur', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℋℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ' },
    5: { name: 'Bold Fraktur', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅' },
    
    // Sans-serif
    6: { name: 'Sans-Serif Bold', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵' },
    7: { name: 'Sans-Serif Italic', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡' },
    8: { name: 'Sans-Serif Bold Italic', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕' },
    
    // Serif
    9: { name: 'Serif Bold', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    10: { name: 'Serif Italic', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍' },
    
    // Monospace
    11: { name: 'Monospace', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿' },
    
    // Circled
    12: { name: 'Circled', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨' },
    13: { name: 'Circled Negative', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩' },
    
    // Squared
    14: { name: 'Squared', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉' },
    15: { name: 'Squared Negative', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉' },
    
    // Fullwidth
    16: { name: 'Fullwidth', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９' },
    
    // Small Caps
    17: { name: 'Small Caps', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢABCDEFGHIJKLMNOPQRSTUVWXYZ' },
    
    // Strikes
    18: { name: 'Strikethrough', convert: (text) => text.split('').join('\u0336') + '\u0336' },
    19: { name: 'Underline', convert: (text) => text.split('').join('\u0332') + '\u0332' },
    20: { name: 'Double Underline', convert: (text) => text.split('').join('\u0333') + '\u0333' },
    
    // Weird/Decorative
    21: { name: 'Vaporwave', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９' },
    22: { name: 'Wide', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ' },
    23: { name: 'Tiny', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ' },
    24: { name: 'Superscript', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹' },
    25: { name: 'Subscript', map: 'abcdefghijklmnopqrstuvwxyz0123456789', convert: 'ₐᵦc𝒹ₑբ₉ₕᵢⱼₖₗₘₙₒₚᵩᵣₛₜᵤᵥwₓᵧ₂₀₁₂₃₄₅₆₇₈₉' },
    
    // Upside down
    26: { name: 'Upside Down', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎzⱯᗺƆᗡƎℲ⅁HIᒋʞ⅃WNOԀὉᴚS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86' },
    
    // Bubble
    27: { name: 'Bubble', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨' },
    28: { name: 'Black Bubble', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩' },
    
    // Currency
    29: { name: 'Currency', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ' },
    
    // Math
    30: { name: 'Math Bold', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙' },
    31: { name: 'Math Italic', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍' },
    32: { name: 'Math Bold Italic', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁' },
    
    // Aesthetic
    33: { name: 'Aesthetic', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ａｅｓｔｈｅｔｉｃ' }, // Special mapping needed
    34: { name: 'Spaced', convert: (text) => text.split('').join(' ') },
    35: { name: 'Spaced Wide', convert: (text) => text.split('').join('   ') },
    
    // Zalgo/Creepy
    36: { name: 'Zalgo Mini', convert: (text) => text.split('').map(c => c + '\u0300').join('') },
    37: { name: 'Zalgo Medium', convert: (text) => text.split('').map(c => c + '\u0300\u0304').join('') },
    38: { name: 'Zalgo Max', convert: (text) => text.split('').map(c => c + '\u0300\u0304\u0305').join('') },
    
    // Brackets
    39: { name: 'Brackets Round', convert: (text) => '(' + text.split('').join(')(') + ')' },
    40: { name: 'Brackets Square', convert: (text) => '[' + text.split('').join('][') + ']' },
    41: { name: 'Brackets Curly', convert: (text) => '{' + text.split('').join('}{') + '}' },
    42: { name: 'Brackets Angle', convert: (text) => '<' + text.split('').join('><') + '>' },
    
    // Boxed
    43: { name: 'Boxed', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', convert: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🞀🞁🞂🞃🞄🞅🞆🞇🞈🞉' },
    
    // Regional Indicators (Flags style)
    44: { name: 'Regional', map: 'abcdefghijklmnopqrstuvwxyz', convert: '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿' },
    
    // Dotted
    45: { name: 'Dotted', convert: (text) => text.split('').join('•') + '•' },
    46: { name: 'Dashed', convert: (text) => text.split('').join('-') + '-' },
    47: { name: 'Slashed', convert: (text) => text.split('').join('/') + '/' },
    
    // Emoji letters
    48: { name: 'Letter Emoji', convert: (text) => {
        const emojiMap = {a:'🅰️',b:'🅱️',c:'🇨',d:'🇩',e:'🇪',f:'🇫',g:'🇬',h:'🇭',i:'🇮',j:'🇯',k:'🇰',l:'🇱',m:'🇲',n:'🇳',o:'🅾️',p:'🅿️',q:'🇶',r:'🇷',s:'🇸',t:'🇹',u:'🇺',v:'🇻',w:'🇼',x:'🇽',y:'🇾',z:'🇿'};
        return text.toLowerCase().split('').map(c => emojiMap[c] || c).join('');
    }},
    
    // Morse code
    49: { name: 'Morse', convert: (text) => {
        const morse = {a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..'};
        return text.toLowerCase().split('').map(c => morse[c] || c).join(' ');
    }},
    
    // Binary
    50: { name: 'Binary', convert: (text) => {
        return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    }},
    
    // Hex
    51: { name: 'Hex', convert: (text) => {
        return text.split('').map(c => '0x' + c.charCodeAt(0).toString(16).toUpperCase()).join(' ');
    }},
    
    // Reverse
    52: { name: 'Reverse', convert: (text) => text.split('').reverse().join('') },
    
    // Alternating
    53: { name: 'Alternating Case', convert: (text) => {
        return text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
    }},
    54: { name: 'Random Case', convert: (text) => {
        return text.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');
    }},
    
    // Fancy
    55: { name: 'Fancy 1', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'ᗩᗷᑕᗪEᖴGᕼIᒍKᒪᗰᑎOᑭᑫᖇᔕTᑌᐯᗯ᙭YᘔᗩᗷᑕᗪEᖴGᕼIᒍKᒪᗰᑎOᑭᑫᖇᔕTᑌᐯᗯ᙭Yᘔ' },
    56: { name: 'Fancy 2', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: '卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙' },
    57: { name: 'Fancy 3', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'ﾑ乃ᄃり乇ｷムんﾉﾌズﾚﾶ刀のｱq尺丂ｲひ√wﾒﾘ乙ﾑ乃ᄃり乇ｷムんﾉﾌズﾚﾶ刀のｱq尺丂ｲひ√wﾒﾘ乙' },
    58: { name: 'Fancy 4', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'αв¢∂єƒgнιנкℓмησρqяѕтυνωχуzαв¢∂єƒgнιנкℓмησρqяѕтυνωχуz' },
    59: { name: 'Fancy 5', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'ค๒ς๔єŦɠђเןкɭ๓ภ๏թợгรՇยשฬאץչค๒ς๔єŦɠђเןкɭ๓ภ๏թợгรՇยשฬאץչ' },
    60: { name: 'Fancy 6', map: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', convert: 'ąცƈɖɛʄɠɧıʝƙƖɱŋơ℘զཞʂɬų۷ῳҳყʑąცƈɖɛʄɠɧıʝƙƖɱŋơ℘զཞʂɬų۷ῳҳყʑ' },
    
    // Special
    61: { name: 'Cute', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ᗩᗷᑕᗪᗴᖴᘜᕼIᒍKᒪᗰᑎOᑭᑫᖇᔕTᑌᐯᗯ᙭Yᘔ' },
    62: { name: 'Magic', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӼʏʐ' },
    63: { name: 'Dark', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ąცƈɖɛʄɠɧıʝƙƖɱŋơ℘զཞʂɬų۷ῳҳყʑ' },
    64: { name: 'Light', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'αв¢∂єƒgнιנкℓмησρqяѕтυνωχуz' },
    65: { name: 'Fire', map: 'abcdefghijklmnopqrstuvwxyz', convert: '卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙' },
    66: { name: 'Ice', map: 'abcdefghijklmnopqrstuvwxyz', convert: 'ﾑ乃ᄃり乇ｷムんﾉﾌズﾚﾶ刀のｱq尺丂ｲひ√wﾒﾘ乙' },
    
    // More decorative
    67: { name: 'Heart', convert: (text) => '❤️ ' + text + ' ❤️' },
    68: { name: 'Star', convert: (text) => '⭐ ' + text + ' ⭐' },
    69: { name: 'Sparkle', convert: (text) => '✨ ' + text + ' ✨' },
    70: { name: 'Fire Emoji', convert: (text) => '🔥 ' + text + ' 🔥' },
    71: { name: 'Cool', convert: (text) => '😎 ' + text + ' 😎' },
    72: { name: 'Alien', convert: (text) => '👽 ' + text + ' 👽' },
    73: { name: 'Ghost', convert: (text) => '👻 ' + text + ' 👻' },
    74: { name: 'Robot', convert: (text) => '🤖 ' + text + ' 🤖' },
    75: { name: 'Clown', convert: (text) => '🤡 ' + text + ' 🤡' },
    76: { name: 'Skull', convert: (text) => '💀 ' + text + ' 💀' },
    77: { name: 'Poop', convert: (text) => '💩 ' + text + ' 💩' },
    78: { name: 'Devil', convert: (text) => '😈 ' + text + ' 😈' },
    79: { name: 'Angel', convert: (text) => '😇 ' + text + ' 😇' },
    80: { name: 'Money', convert: (text) => '💰 ' + text + ' 💰' },
    81: { name: 'Bomb', convert: (text) => '💣 ' + text + ' 💣' },
    82: { name: 'Warning', convert: (text) => '⚠️ ' + text + ' ⚠️' },
    83: { name: 'Check', convert: (text) => '✅ ' + text + ' ✅' },
    84: { name: 'Cross', convert: (text) => '❌ ' + text + ' ❌' },
    85: { name: 'Question', convert: (text) => '❓ ' + text + ' ❓' },
    86: { name: 'Exclamation', convert: (text) => '❗ ' + text + ' ❗' },
    87: { name: 'Arrow', convert: (text) => '➡️ ' + text + ' ⬅️' },
    88: { name: 'Crown', convert: (text) => '👑 ' + text + ' 👑' },
    89: { name: 'Gem', convert: (text) => '💎 ' + text + ' 💎' },
    90: { name: 'Trophy', convert: (text) => '🏆 ' + text + ' 🏆' },
    91: { name: 'Medal', convert: (text) => '🏅 ' + text + ' 🏅' },
    92: { name: 'Rocket', convert: (text) => '🚀 ' + text + ' 🚀' },
    93: { name: 'UFO', convert: (text) => '🛸 ' + text + ' 🛸' },
    94: { name: 'Rainbow', convert: (text) => '🌈 ' + text + ' 🌈' },
    95: { name: 'Sun', convert: (text) => '☀️ ' + text + ' ☀️' },
    96: { name: 'Moon', convert: (text) => '🌙 ' + text + ' 🌙' },
    97: { name: 'Cloud', convert: (text) => '☁️ ' + text + ' ☁️' },
    98: { name: 'Lightning', convert: (text) => '⚡ ' + text + ' ⚡' },
    99: { name: 'Flower', convert: (text) => '🌸 ' + text + ' 🌸' },
    100: { name: 'Tree', convert: (text) => '🌲 ' + text + ' 🌲' },
    101: { name: 'Pizza', convert: (text) => '🍕 ' + text + ' 🍕' },
    102: { name: 'Burger', convert: (text) => '🍔 ' + text + ' 🍔' },
    103: { name: 'Coffee', convert: (text) => '☕ ' + text + ' ☕' },
    104: { name: 'Beer', convert: (text) => '🍺 ' + text + ' 🍺' },
    105: { name: 'Music', convert: (text) => '🎵 ' + text + ' 🎵' },
    106: { name: 'Game', convert: (text) => '🎮 ' + text + ' 🎮' },
    107: { name: 'Movie', convert: (text) => '🎬 ' + text + ' 🎬' },
    108: { name: 'Book', convert: (text) => '📚 ' + text + ' 📚' },
    109: { name: 'Code', convert: (text) => '💻 ' + text + ' 💻' },
    110: { name: 'Phone', convert: (text) => '📱 ' + text + ' 📱' }
};

// ── CONVERT TEXT FUNCTION ──
function convertText(text, fontId) {
    const font = fonts[fontId];
    if (!font) return text;

    // If font has a convert function (for special effects)
    if (typeof font.convert === 'function') {
        return font.convert(text);
    }

    // If font has a map (for character replacement)
    if (font.map && font.convert) {
        let result = '';
        for (const char of text) {
            const index = font.map.indexOf(char);
            if (index !== -1) {
                result += font.convert[index];
            } else {
                result += char; // Keep original if not in map
            }
        }
        return result;
    }

    return text;
}

// ── GET FONT BY NAME OR ID ──
function getFont(input) {
    // Check if input is a number
    const numId = parseInt(input);
    if (!isNaN(numId) && fonts[numId]) {
        return { id: numId, ...fonts[numId] };
    }

    // Search by name (case insensitive)
    const searchName = input.toLowerCase();
    for (const [id, font] of Object.entries(fonts)) {
        if (font.name.toLowerCase() === searchName || 
            font.name.toLowerCase().includes(searchName)) {
            return { id: parseInt(id), ...font };
        }
    }

    return null;
}

// ── LIST ALL FONTS ──
function listFonts(page = 1) {
    const perPage = 20;
    const total = Object.keys(fonts).length;
    const totalPages = Math.ceil(total / perPage);
    
    let text = `📝 *CRYSNOVA FONTS*\n_Total: ${total} fonts_\n_Page ${page}/${totalPages}_\n\n`;
    
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    
    for (let i = start; i <= end; i++) {
        if (fonts[i]) {
            text += `${i}. ${fonts[i].name}\n`;
        }
    }
    
    text += `\nUse: ${page < totalPages ? `.allfonts ${page + 1} for more` : 'End of list'}`;
    return text;
}

// ── MAIN MODULE ──
module.exports = {
    name: 'font',
    alias: ['fonts', 'allfonts', 'botfont', 'style', 'textstyle'],
    category: 'tools',
    owner: false,
    desc: 'Convert text to 100+ stylish fonts',

    execute: async (sock, m, { args, reply, prefix, command, config }) => {
        const chatId = m.chat;

        // ── LIST ALL FONTS ──
        if (command === 'allfonts') {
            const page = parseInt(args[0]) || 1;
            return reply(listFonts(page));
        }

        // ── SET BOT FONT ──
        if (command === 'botfont') {
            if (!args.length) {
                const current = botFontSettings[chatId];
                if (current) {
                    const font = fonts[current];
                    return reply(`⚉ Current bot font: *${font?.name || 'None'}*\n\nUse \`${prefix}botfont <name or number>\` to change\nUse \`${prefix}botfont off\` to disable`);
                }
                return reply(`⚉ No bot font set\n\nUse \`${prefix}botfont <name or number>\` to set one`);
            }

            // Turn off bot font
            if (args[0].toLowerCase() === 'off' || args[0].toLowerCase() === 'disable') {
                delete botFontSettings[chatId];
                saveSettings();
                return reply('✓ _*Bot font disabled*_');
            }

            const fontInput = args[0];
            const font = getFont(fontInput);

            if (!font) {
                return reply(`✘ *Font "${fontInput}" not found*\n\n_Use \`${prefix}allfonts\` to see available fonts_`);
            }

            botFontSettings[chatId] = font.id;
            saveSettings();

            const sample = convertText('CRYSNOVA AI', font.id);
            return reply(`✓ *Bot font set to: ${font.name}*\n\nSample: ${sample}\n\n_*All bot replies will now use this font in this chat!*_`);
        }

        // ── CONVERT TEXT ──
        if (command === 'font' || command === 'style') {
            if (args.length < 2) {
                return reply(
`*📝 FONT CONVERTER*

*Usage:*
${prefix}font <name or number> <text>

*Examples:*
${prefix}font 1 Hello World ⚉
${prefix}font script Hello World ⚉
${prefix}font double-struck Hello World ⚉

*Tip:* Use \`${prefix}allfonts\` to see all fonts`
                );
            }

            const fontInput = args[0];
            const text = args.slice(1).join(' ');
            
            const font = getFont(fontInput);

            if (!font) {
                return reply(`✘ *Font "${fontInput}" not found*\n\n_Use \`${prefix}allfonts\` to see available fonts_`);
            }

            const converted = convertText(text, font.id);

            await sock.sendMessage(m.chat, {
                text: converted,
                contextInfo: {
                    externalAdReply: {
                        title: `Font: ${font.name}`,
                        body: 'CRYSNOVA Font Converter',
                        thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/2912/2912780.png",
                        sourceUrl: "https://github.com/crysnovax",
                        mediaType: 1
                    }
                }
            }, { quoted: m });
        }
    },

    // ── BOT FONT MIDDLEWARE ──
    // Call this from your main bot to auto-convert bot messages
    applyBotFont: (chatId, text) => {
        const fontId = botFontSettings[chatId];
        if (!fontId || !fonts[fontId]) return text;
        return convertText(text, fontId);
    }
};
// ── AUTO FONT MIDDLEWARE ──
module.exports.handleBotFont = async function(sock, m) {
    try {
        if (!m.isGroup || m.key.fromMe) return;

        const chatId = m.chat;
        const fontId = botFontSettings[chatId];

        if (!fontId || !fonts[fontId]) return;

        const text = m.text;
        if (!text) return;

        const converted = convertText(text, fontId);

        await sock.sendMessage(m.chat, {
            text: converted
        }, { quoted: m });

    } catch (e) {
        console.log('[FONT MIDDLEWARE]', e.message);
    }
};
