module.exports = {
    name:     'poll',
    alias:    ['createpoll', 'vote'],
    desc:     'Create a WhatsApp native poll in a group',
    category: 'Group',
    groupOnly: true,
    reactions: { start: '📊', success: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {

        // ── Parse input ────────────────────────────────────────
        // Format: .poll Question | Option1 | Option2 | Option3
        // Or:     .poll multi Question | Option1 | Option2 (multi-select)
        if (!args.length) {
            return reply(
                `╭─❍𓀀 *📊 POLL CREATOR*\n│\n` +
                `│ —͟͟͞͞𖣘*Single choice (default):*\n` +
                `│ _${prefix}poll Question | Option1 | Option2_\n│\n` +
                `│ ⟁⃝*Multi choice:*\n` +
                `│ _${prefix}poll multi Question | Option1 | Option2_\n│\n` +
                `│ 𓄄 Min 2 options, max 12 options\n` +
                `╰──────────────────`
            )
        }

        let isMulti = false
        let fullText = args.join(' ').trim()

        if (fullText.toLowerCase().startsWith('multi ')) {
            isMulti  = true
            fullText = fullText.slice(6).trim()
        }

        const parts = fullText.split('|').map(p => p.trim()).filter(Boolean)

        if (parts.length < 3) {
            return reply(
                `_✘ Need at least a question and 2 options_\n` +
                `_Example: ${prefix}poll Who is best? | Ronaldo | Messi | Mbappe_`
            )
        }

        const question = parts[0]
        const options  = parts.slice(1)

        if (options.length > 12) {
            return reply('_✘ Maximum 12 options allowed_')
        }

        // Validate option length
        for (const opt of options) {
            if (opt.length > 100) return reply(`_✘ Option too long: "${opt.slice(0, 20)}..."_`)
        }

        if (question.length > 255) return reply('_✘ Question too long (max 255 characters)_')

        // ── Send native WhatsApp poll ──────────────────────────
        try {
            await sock.sendMessage(m.chat, {
                poll: {
                    name:            question,
                    values:          options,
                    selectableCount: isMulti ? 0 : 1  // 0 = unlimited (multi), 1 = single
                }
            }, { quoted: m })
        } catch (err) {
            console.error('[POLL ERROR]', err.message)
            reply(`_✘ Failed to create poll: ${err.message}_`)
        }
    }
}

