const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "pixel",
    alias: [],
    category: "media",
    desc: "Pixelate a replied image",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted) return reply("Reply to an image.");
        if (!m.quoted.mtype?.includes("image"))
            return reply("Reply to an image only.");

        try {

            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "pixel", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "✨ Pixel ✔"
            }, { quoted: m });

        } catch (err) {
            reply("Failed to edit image.");
        }
    }
};