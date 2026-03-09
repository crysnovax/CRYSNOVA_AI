const axios = require('axios')

module.exports = {
    name: 'translate',
    alias: ['tr', 'trans', 'tl'],
    category: 'WhatsApp',

    execute: async (sock, m, { reply, args, quoted }) => {

        try {

            let lang = args[0]?.toLowerCase() || 'en'
            let text = args.slice(1).join(' ')

            // If replying to message
            if (!text && quoted?.text) {
                text = quoted.text
            }

            if (!text) {
                return reply(`⚉ Usage:
.translate <lang> <text>
.translate <lang> (reply to message)

Example:
.tr es Hello
.tr id (reply message)`)
            }

            // ===== Google Translate API =====
            try {

                const res = await axios.get(
                    `https://translate.googleapis.com/translate_a/single`,
                    {
                        params: {
                            client: 'gtx',
                            sl: 'auto',
                            tl: lang,
                            dt: 't',
                            q: text
                        },
                        timeout: 10000
                    }
                )

                const data = res.data

                if (!data || !data[0])
                    throw new Error("Translation error")

                const translated = data[0]
                    .map(item => item[0])
                    .join('')

                const detectedLang = data?.[2] || 'auto'

                return reply(
                    `乂 *TRANSLATED*\n\n` +
                    `☬ From: ${detectedLang.toUpperCase()}\n` +
                    `⚉ To: ${lang.toUpperCase()}\n` +
                    `𓄄 Original: ${text.substring(0, 120)}\n\n` +
                    `\n` +
                    `亗 Result: ${translated}\n\n` +
                    `⚉ Powered by Google Translate`
                )

            } catch {

                // ===== Fallback API =====
                const fallback = await axios.get(
                    `https://api.mymemory.translated.net/get`,
                    {
                        params: {
                            q: text,
                            langpair: `auto|${lang}`
                        },
                        timeout: 10000
                    }
                )

                const data = fallback.data

                if (data?.responseStatus === 200) {

                    return reply(
                        `乂 *TRANSLATED*\n\n` +
                        `☬ From: ${data.responseData.detectedLanguage || 'auto'}\n` +
                        `⚉ To: ${lang.toUpperCase()}\n` +
                        `𓄄 Result: ${data.responseData.translatedText}`
                    )

                }

                reply('✘ Translation service busy')
            }

        } catch (err) {
            console.log(err.message)
            reply('✘ Translation failed')
        }
    }
}