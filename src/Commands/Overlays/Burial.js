const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "burial",
    category: "media",
    desc: "Apply burial effect",

    execute: async (sock, m, { reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "burial");

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "⚰️ burial ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to apply jail effect.");
        }
    }
};