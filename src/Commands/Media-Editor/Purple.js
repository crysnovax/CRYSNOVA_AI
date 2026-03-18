const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "purple",
    category: "media",
    desc: "Apply purple effect",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "purple", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🟣 Purple ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};