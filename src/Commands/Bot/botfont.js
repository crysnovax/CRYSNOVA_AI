const fs = require("fs");
const path = require("path");
const styles = require("../Core/'.js"); 

const FILE = path.join(__dirname, "../../../database/botfont.json");

function loadDB() {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE));
    }
  } catch {}
  return { global: null, groups: {} };
}

function saveDB(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getFont(jid) {
  const db = loadDB();

  // Group font first
  if (jid?.endsWith("@g.us") && db.groups[jid]) {
    return db.groups[jid];
  }

  // Global font
  return db.global;
}

module.exports = {
  name: "botfont",
  alias: ["setfont"],
  category: "tools",

  execute: async (sock, m, { args, reply }) => {

    const jid = m.key.remoteJid;

    const styleList = Object.keys(styles).filter(
      key => typeof styles[key] === "function"
    );

    /* ---------- LIST FONTS ---------- */
    if (!args[0] || args[0].toLowerCase() === "list") {

      let text = "📚 Available Fonts:\n\n";

      styleList.forEach((s, i) => {
        const preview = styles[s]("CRYSNOVA");
        text += `${i + 1}. ${s}\n   ➜ ${preview}\n\n`;
      });

      return reply(text);
    }

    const index = parseInt(args[0]);
    if (isNaN(index)) {
      return reply("Use:\n.botfont list\n.botfont <number>\n.botfont group <number>");
    }

    const fontName = styleList[index - 1];
    if (!fontName) return reply("Invalid font number.");

    const db = loadDB();

    /* ---------- GROUP FONT ---------- */
    if (args[0].toLowerCase() === "group") {
      const groupIndex = parseInt(args[1]);
      const groupFont = styleList[groupIndex - 1];
      if (!groupFont) return reply("Invalid group font number.");

      db.groups[jid] = groupFont;
      saveDB(db);

      return reply(`✓ Group font set to: ${groupFont}`);
    }

    /* ---------- GLOBAL FONT ---------- */
    db.global = fontName;
    saveDB(db);

    return reply(`_*✦ Global bot font set to: ${fontName}*_`);
  },

  getFont
};