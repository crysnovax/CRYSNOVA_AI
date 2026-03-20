const fs = require("fs");
const path = require("path");
const { getLunaResponse } = require("../Core/!!!.js");

module.exports = {
 name: "xm",
 alias: ["mcmd"],
 category: "ai",

 execute: async (sock, m, { args, reply }) => {

 if (args[0] !== "command") {
 return reply("Usage:\n.luna make command <name> [description]");
 }

 const name = args[1];
 const desc = args.slice(2).join(" ") || "Custom command";

 if (!name) return reply("Provide command name.");

 try {

 await reply("✦ _*CODING...*_");

 const prompt = `
Generate ONLY valid JavaScript code for a WhatsApp bot command.

STRICT RULES:
- Output ONLY code (no explanation, no markdown, no text)
- Must start with: module.exports = {
- Must include: name, category, desc, execute
- Must be valid Node.js code
- Use async execute(sock, m, { args, reply })
- Use sock.sendMessage
- No syntax errors
- No comments outside code
- No backticks

Command name: ${name}
Description: ${desc}
`;

 let code = await getLunaResponse(prompt);

 /* 🔥 CLEAN RESPONSE */
 code = code
 .replace(/```js/g, "")
 .replace(/```/g, "")
 .trim();

 /* ❌ REJECT BAD CODE */
 if (!code.includes("module.exports")) {
 return reply("`⚉ AI returned invalid code.`");
 }

 /* ✅ BASIC SYNTAX CHECK */
 try {
 new Function(code);
 } catch (err) {
 return reply("_*✘ Generated code has syntax errors.*_");
 }

 const filePath = path.join(__dirname, `${name}.js`);

 fs.writeFileSync(filePath, code);

 reply(`_*✦ Command "${name}" created successfully.*_`);

 } catch (err) {
 console.log(err);
 reply("❌ Failed to generate command.");
 }
 }
};