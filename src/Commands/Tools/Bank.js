module.exports = {
    name: 'bank',
    alias: ['aza','account','sendaza','setbank','setaza'],
    category: 'tools',
    desc: 'View or set bank account details (Aza)',

    execute: async (sock, m, { args, reply, prefix }) => {

        if (!global.bankDetails) {
            global.bankDetails = {
                bankName: '',
                accNumber: '',
                accName: '',
                phone: '',
                note: '',
                setBy: ''
            }
        }

        const command = m.text.split(' ')[0].toLowerCase().replace(prefix,'')
        const isSet = ['setbank','setaza'].includes(command)

        if (isSet) {

            if (args.length < 3) {
                return reply(
`╭─❍ *AZA SETUP*
│ ⚉ Usage:
│ ${prefix}${command} Bank AccNumber AccName [Phone] [Note]
│
│ ✦ Example:
│ ${prefix}${command} Opay 8123456789 John Doe 08012345678 Donation
╰─`
                )
            }

            global.bankDetails.bankName = args[0]
            global.bankDetails.accNumber = args[1]

            const remaining = args.slice(2)

            global.bankDetails.accName =
                remaining.slice(0, remaining.length - (remaining.length > 2 ? 2 : 0)).join(' ')

            global.bankDetails.phone =
                remaining.length > 2 ? remaining[remaining.length - 2] : ''

            global.bankDetails.note =
                remaining.length > 2 ? remaining[remaining.length - 1] : ''

            global.bankDetails.setBy = m.sender.split('@')[0]

            return reply(
`╭─❍ *AZA UPDATED*
│ ☬ Set by: ${m.sender.split('@')[0]}
│
│ 🏦 Bank: ${global.bankDetails.bankName}
│ 💳 Number: ${global.bankDetails.accNumber}
│ 👤 Name: ${global.bankDetails.accName}
${global.bankDetails.phone ? `│ ☏ Phone: ${global.bankDetails.phone}` : ''}
${global.bankDetails.note ? `│ ✦ Note: ${global.bankDetails.note}` : ''}
╰─`
            )
        }

        if (!global.bankDetails.accNumber) {
            return reply(`⚉ No AZA set yet\nUse ${prefix}setbank to add one`)
        }

        let msg =
`╭─❍ *AZA / BANK DETAILS*
│ 🏦 Bank: ${global.bankDetails.bankName}
│ 💳 Account: ${global.bankDetails.accNumber}
│ 👤 Name: ${global.bankDetails.accName}
`

        if (global.bankDetails.phone)
            msg += `│ ☏ Phone: ${global.bankDetails.phone}\n`

        if (global.bankDetails.note)
            msg += `│ ✦ Note: ${global.bankDetails.note}\n`

        if (global.bankDetails.setBy)
            msg += `│ ⚉ Last set by: ${global.bankDetails.setBy}\n`

        msg += `╰─ 𓄄 Copy & send easily`

        reply(msg)
    }
}