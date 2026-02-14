const { create, all } = require('mathjs');
const math = create(all);

module.exports = {
  command: 'calc',
  owner: true,
  execute: async (sock, m, { reply }) => {
    try {
      const text = m.message?.conversation || m.msg?.text;
      const args = text.split(' ').slice(1);

      if (!args.length) return reply('Usage: .calc 2 * sin(pi / 4)');

      const expression = args.join(' ');
      const result = math.evaluate(expression);

      reply(`🧮 Expression: ${expression}\n𓉤 Result: ${result}`);
    } catch (err) {
      reply('✘ Invalid scientific expression.⚉');
    }
  }
};
