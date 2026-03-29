const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── IGNORE (never deleted or hashed) ──────────────
const IGNORE = [
    "node_modules",
    "sessions",
    ".env",
    "settings/config.js",
    "database/runtime-config.json",
    "database/user-config.json",
    "database/ai-memory.json",
    "src/assets/",
    ".log"
];


function getAllFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // skip ignored
    if (IGNORE.some(i => fullPath.includes(i))) continue;

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function getCodeHash() {
  const files = getAllFiles("./");

  let content = "";

  for (const file of files) {
    content += fs.readFileSync(file);
  }

  return crypto.createHash("sha256").update(content).digest("hex");
}

module.exports = { getCodeHash };
