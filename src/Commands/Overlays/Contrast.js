const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "contrast",
    category: "media",
    desc: "Adjust contrast of replied image",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {

            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "contrast", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🌗 Contrast ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};