const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

module.exports = {
    name: "emojimix",
    alias: ["mixemoji", "emoji"],
    category: "fun",
     // ⭐ Reaction config
    reactions: {
        start: '👌',
        success: '✨'
    },
    

    execute: async (sock, m, { args, reply }) => {

        try {

            const text = args.join(" ");

            if (!text || !text.includes("+")) {
                return reply("🎴 _*Example:\n.emojimix 😎+🥰*_");
            }

            let [emoji1, emoji2] = text.split("+").map(e => e.trim());

            const url =
                `https://tenor.googleapis.com/v2/featured?` +
                `key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ` +
                `&contentfilter=high` +
                `&media_filter=png_transparent` +
                `&collection=emoji_kitchen_v5` +
                `&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;

            const response = await fetch(url);
            const data = await response.json();

            if (!data.results?.length) {
                return reply("𓉤 _*Emoji cannot be mixed*_.");
            }

            const imageUrl = data.results[0].url;

            const tmpDir = path.join(process.cwd(), "tmp");
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const tempFile = path.join(tmpDir, `mix_${Date.now()}.png`);
            const outputFile = path.join(tmpDir, `mix_${Date.now()}.webp`);

            /* Download image */

            const imageBuffer = await (await fetch(imageUrl)).buffer();
            fs.writeFileSync(tempFile, imageBuffer);

            /* Convert to sticker */

            const ffmpegCmd =
                `ffmpeg -y -i "${tempFile}" ` +
                `-vf "scale=512:512:force_original_aspect_ratio=decrease,` +
                `format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" ` +
                `"${outputFile}"`;

            await new Promise((resolve, reject) => {
                exec(ffmpegCmd, err => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            if (!fs.existsSync(outputFile)) {
                return reply("✘ *Sticker generation failed*.");
            }

            const stickerBuffer = fs.readFileSync(outputFile);

            await sock.sendMessage(
                m.key.remoteJid,
                {
                    sticker: stickerBuffer
                },
                { quoted: m }
            );

            /* Cleanup */

            try {
                fs.unlinkSync(tempFile);
                fs.unlinkSync(outputFile);
            } catch {}

        } catch (err) {

            console.error("EmojiMix Error:", err.message);
            reply("❌ Failed to mix emojis.");

        }
    }
};