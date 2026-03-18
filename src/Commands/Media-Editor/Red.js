const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "red",
    category: "media",
    desc: "Apply red effect to replied image",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "red", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🔴 Red ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};