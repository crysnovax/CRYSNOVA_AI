const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "jail",
    category: "media",
    desc: "Apply jail effect",

    execute: async (sock, m, { reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "jail");

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🔒 Jail ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to apply jail effect.");
        }
    }
};