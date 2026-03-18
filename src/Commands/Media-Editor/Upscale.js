const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "upscale",
    alias: [],
    category: "media",
    desc: "Increase quality effect",

    execute: async (sock, m, { reply }) => {

        if (!m.quoted) return reply("Reply to an image.");
        if (!m.quoted.mtype?.includes("image"))
            return reply("Reply to an image only.");

        try {

            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "upscale");

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "✨ upscale ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};