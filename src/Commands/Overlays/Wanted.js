const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "wanted",
    category: "media",
    desc: "Apply wanted poster effect",

    execute: async (sock, m, { reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "wanted");

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🚨 Wanted ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to apply wanted effect.");
        }
    }
};