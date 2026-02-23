module.exports = {
  name: 'font',
  alias: ['allfonts'],
  desc: 'Convert text to styled fonts',
  category: 'Bot',

  execute: async (sock, m, { args, prefix, command }) => {

    const fonts = {

      bold: {
        a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',
        k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',
        u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
        A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',
        K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',
        U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙'
      },

      script: {
        a:'𝓪',b:'𝓫',c:'𝓬',d:'𝓭',e:'𝓮',f:'𝓯',g:'𝓰',h:'𝓱',i:'𝓲',j:'𝓳',
        k:'𝓴',l:'𝓵',m:'𝓶',n:'𝓷',o:'𝓸',p:'𝓹',q:'𝓺',r:'𝓻',s:'𝓼',t:'𝓽',
        u:'𝓾',v:'𝓿',w:'𝔀',x:'𝔁',y:'𝔂',z:'𝔃',
        A:'𝓐',B:'𝓑',C:'𝓒',D:'𝓓',E:'𝓔',F:'𝓕',G:'𝓖',H:'𝓗',I:'𝓘',J:'𝓙',
        K:'𝓚',L:'𝓛',M:'𝓜',N:'𝓝',O:'𝓞',P:'𝓟',Q:'𝓠',R:'𝓡',S:'𝓢',T:'𝓣',
        U:'𝓤',V:'𝓥',W:'𝓦',X:'𝓧',Y:'𝓨',Z:'𝓩'
      },

      mono: {
        a:'𝚊',b:'𝚋',c:'𝚌',d:'𝚍',e:'𝚎',f:'𝚏',g:'𝚐',h:'𝚑',i:'𝚒',j:'𝚓',
        k:'𝚔',l:'𝚕',m:'𝚖',n:'𝚗',o:'𝚘',p:'𝚙',q:'𝚚',r:'𝚛',s:'𝚜',t:'𝚝',
        u:'𝚞',v:'𝚟',w:'𝚠',x:'𝚡',y:'𝚢',z:'𝚣',
        A:'𝙰',B:'𝙱',C:'𝙲',D:'𝙳',E:'𝙴',F:'𝙵',G:'𝙶',H:'𝙷',I:'𝙸',J:'𝙹',
        K:'𝙺',L:'𝙻',M:'𝙼',N:'𝙽',O:'𝙾',P:'𝙿',Q:'𝚀',R:'𝚁',S:'𝚂',T:'𝚃',
        U:'𝚄',V:'𝚅',W:'𝚆',X:'𝚇',Y:'𝚈',Z:'𝚉'
      }

    };

    if (command === 'allfonts') {
      return sock.sendMessage(m.chat, {
        text: `Available Fonts:
1. bold
2. script
3. mono
4. bubble
5. tiny
6. reverse

Usage:
${prefix}font bold Hello`
      }, { quoted: m });
    }

    if (!args[0] || !args[1]) {
      return sock.sendMessage(m.chat, {
        text: `Usage:
${prefix}font bold Hello`
      }, { quoted: m });
    }

    const style = args[0].toLowerCase();
    const text = args.slice(1).join(' ');

    if (style === 'reverse') {
      return sock.sendMessage(m.chat, {
        text: text.split('').reverse().join('')
      }, { quoted: m });
    }

    if (style === 'tiny') {
      const tinyMap = {
        a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ᶦ',j:'ʲ',
        k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',q:'ᑫ',r:'ʳ',s:'ˢ',t:'ᵗ',
        u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ'
      };

      let result = '';
      for (let char of text.toLowerCase()) {
        result += tinyMap[char] || char;
      }

      return sock.sendMessage(m.chat, { text: result }, { quoted: m });
    }

    if (style === 'bubble') {
      const bubble = text
        .replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) + 9327))
        .replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 9333));

      return sock.sendMessage(m.chat, { text: bubble }, { quoted: m });
    }

    const map = fonts[style];

    if (!map) {
      return sock.sendMessage(m.chat, {
        text: `Invalid font style.
Use: ${prefix}allfonts`
      }, { quoted: m });
    }

    let result = '';
    for (let char of text) {
      result += map[char] || char;
    }

    await sock.sendMessage(m.chat, { text: result }, { quoted: m });
  }
};
