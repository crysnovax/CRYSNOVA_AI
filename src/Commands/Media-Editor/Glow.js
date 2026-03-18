const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "glow",
    alias: [],
    category: "media",
    desc: "Add glow effect",

    execute: async (sock, m, { reply }) => {

        if (!m.quoted) return reply("Reply to an image.");
        if (!m.quoted.mtype?.includes("image"))
            return reply("Reply to an image only.");

        try {

            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "glow");

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "✨ Glow ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};