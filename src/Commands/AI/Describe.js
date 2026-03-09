const axios    = require('axios');
const FormData = require('form-data');
const path     = require('path');

// ── Load Groq API key — tries every possible path ─────
const getGroqKey = () => {
    // 1. Environment variable (always works)
    if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;

    // 2. Try config from multiple relative paths
    const attempts = [
        '../../settings/config',
        '../../../settings/config',
        '../../../../settings/config',
        path.join(process.cwd(), 'settings/config'),
        path.join(process.cwd(), 'settings', 'config'),
    ];

    for (const p of attempts) {
        try {
            const cfg = require(p);
            const key = cfg?.api?.groq || cfg?.groq || cfg?.GROQ_API_KEY;
            if (key) return key;
        } catch {}
    }

    // 3. Try global config if set
    if (global.config?.api?.groq) return global.config.api.groq;

    return null;
};

// ── Upload image → public URL ─────────────────────────
const uploadImage = async (buffer) => {
    // Try catbox.moe
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('userhash', '');
        form.append('fileToUpload', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        if (typeof res.data === 'string' && res.data.startsWith('https://'))
            return res.data.trim();
    } catch {}

    // Fallback: tmpfiles.org
    const form2 = new FormData();
    form2.append('file', buffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
    });
    const res2 = await axios.post('https://tmpfiles.org/api/v1/upload', form2, {
        headers: form2.getHeaders(),
        timeout: 20000
    });
    const url = res2.data?.data?.url;
    if (!url) throw new Error('All image upload hosts failed');
    return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
};

// ── Groq Vision ───────────────────────────────────────
const describeImage = async (imageUrl, prompt, groqKey) => {
    const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: imageUrl } },
                        { type: 'text', text: prompt }
                    ]
                }
            ],
            max_tokens: 1024
        },
        {
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    );

    const text = res.data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('No response from AI');
    return text.trim();
};

// ═════════════════════════════════════════════════════

module.exports = {
    name: 'caption',
    alias: ['describe', 'imgai', 'aicap', 'ocr', 'seethis'],
    category: 'AI',
    desc: 'AI describes any image using Llama 4 Vision',
    usage: '.caption (reply to image) | .caption <question> (reply to image)',

    execute: async (sock, m, { reply, args }) => {

        if (!m.quoted) return reply(
            `╭──────────────────────\n` +
            `│ 乂 *AI IMAGE CAPTION*\n` +
            `╰──────────────────────\n` +
            `*Usage:*\n` +
            `› Reply to any image with *.caption*\n` +
            `› Ask something: *.caption what brand is this?*\n\n` +
            `*Aliases:* .describe .imgai .aicap .seethis`
        );

        const mtype = m.quoted?.mtype || '';
        const isImage = mtype.includes('image') || mtype.includes('sticker');

        if (!isImage) return reply(
            `╭──────────────────────\n` +
            `│ ✘ Reply to an image\n` +
            `╰──────────────────────\n` +
            `This command only works on images and stickers.`
        );

        // ── Get Groq key ───────────────────────────────
        const groqKey = getGroqKey();
        console.log('[CAPTION] Groq key found:', groqKey ? '✓ YES' : '✗ NO');

        if (!groqKey) return reply(
            `╭──────────────────────\n` +
            `│ ✘ Groq API key missing\n` +
            `╰──────────────────────\n` +
            `Add *GROQ_API_KEY* in your Pterodactyl startup variables\n` +
            `or set it in *settings/config.js* under *api.groq*\n` +
            `Get one free at groq.com`
        );

        const customPrompt = args.join(' ').trim();
        const prompt = customPrompt ||
            'Describe this image in detail. Include what you see, any visible text, colors, objects, people, setting, mood, and anything notable.';

        await reply(
            `╭──────────────────────\n` +
            `│ ✦ *Analyzing image...*\n` +
            `╰──────────────────────\n` +
            `_Please wait, AI is reading the image_`
        );

        try {
            // 1. Download
            const buffer = await m.quoted.download();
            if (!buffer?.length) return reply(
                `╭──────────────────────\n` +
                `│ ✘ Download failed\n` +
                `╰──────────────────────\n` +
                `Could not download the image. Try again.`
            );

            // 2. Upload to get public URL
            let imageUrl;
            try {
                imageUrl = await uploadImage(buffer);
                console.log('[CAPTION] Uploaded:', imageUrl);
            } catch (uploadErr) {
                return reply(
                    `╭──────────────────────\n` +
                    `│ ✘ Upload failed\n` +
                    `╰──────────────────────\n` +
                    `${uploadErr.message}`
                );
            }

            // 3. Groq Vision
            const description = await describeImage(imageUrl, prompt, groqKey);

            return reply(
                `╭──────────────────────\n` +
                `│ 乂 *AI IMAGE CAPTION*\n` +
                `╰──────────────────────\n` +
                `${description}\n\n` +
                `_⚉ Powered by 𝓬𝓻𝔂𝓼𝓷𝓸𝓿𝓪𝔁 𝓿𝓮𝓻𝓲𝓯𝓲𝓮𝓭_`
            );

        } catch (err) {
            console.error('[CAPTION ERROR]', err.message);
            return reply(
                `╭──────────────────────\n` +
                `│ ✘ Analysis failed\n` +
                `╰──────────────────────\n` +
                `${err.message}`
            );
        }
    }
};
