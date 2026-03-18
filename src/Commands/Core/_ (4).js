const { downloadMedia } = require("./°.js");
const imageCore = require("./,,.js");

function createImageCommand(effect, options = {}) {

    return {
        name: effect,
        category: "tools",

        execute: async (sock, m, { reply }) => {

            const buffer = await downloadMedia(sock, m);
            if (!buffer) {
                return reply("_*𓄄 Reply to an image.*_");
            }

            try {

                let result;

                // If it's a normal effect
                if (imageCore.applyEffect && options.type === "effect") {
                    result = await imageCore.applyEffect(buffer, effect);
                }

                // If it's overlay
                if (options.type === "overlay") {
                    result = await imageCore.addOverlay(buffer, options.file);
                }

                await sock.sendMessage(m.chat, {
                    image: result,
                    caption: `${effect} ✓`
                });

            } catch (err) {
                reply("_*✘ Error processing image.*_");
            }
        }
    };
}

module.exports = {
    createImageCommand
};