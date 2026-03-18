const { applyEffect } = require("../Core/,,.js");

module.exports = {
    name: "green",
    category: "media",
    desc: "Apply green effect to replied image",

    execute: async (sock, m, { args, reply }) => {

        if (!m.quoted?.mtype?.includes("image"))
            return reply("Reply to an image.");

        try {
            const buffer = await m.quoted.download();
            const result = await applyEffect(buffer, "green", args);

            await sock.sendMessage(m.chat, {
                image: result,
                mimetype: "image/png",
                caption: "🟢 Green ✔"
            }, { quoted: m });

        } catch {
            reply("Failed to edit image.");
        }
    }
};