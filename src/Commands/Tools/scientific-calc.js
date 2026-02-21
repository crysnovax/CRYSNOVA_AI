const math = require('mathjs');

module.exports = {
    name: 'calculator',
    alias: ['calc', 'scientificcalc'],
    desc: 'Scientific calculator with mathjs',
    category: 'tools',
    usage: '.calculator → show menu\n.calc <expression> → evaluate',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        try {
            // ── Show Menu if no args ──
            if (!args.length) {
                return reply(
                    `⚉ *Scientific Calculator*\n\n` +
                    `Usage:\n` +
                    `• .calc 2+3*4 → basic arithmetic\n` +
                    `• .calc sin(pi/2) → trig functions\n` +
                    `• .calc log(100,10) → logarithms\n` +
                    `• .calc sqrt(16) → square roots\n` +
                    `• .calc factorial(5) → factorials\n\n` +
                    `Supports: + - * / ^ %, sin, cos, tan, log, sqrt, factorial, pi, e, and more.\n` +
                    `⚉ Example: .calc (2+3)^2 / 5`
                );
            }

            // ── Join args into expression ──
            const expression = args.join(' ');

            // ── Evaluate expression safely ──
            let result;
            try {
                result = math.evaluate(expression);
            } catch {
                return reply('✘ Invalid expression. Check syntax.');
            }

            return reply(`⚉ Expression: ${expression}\n⚉ Result: ${result}`);
        } catch (err) {
            console.error('✘ Calculator Error:', err.message);
            return reply('✘ Error evaluating expression.');
        }
    }
};