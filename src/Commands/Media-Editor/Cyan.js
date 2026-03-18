const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "cyan",
    category: "media",
    desc: "Apply cyan effect to replied image",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "cyan", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🩵 Cyan ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};