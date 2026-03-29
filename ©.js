const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getCodeHash } = require("./hash");

const API = "https://api.crysnovax.workers.dev";
const REPO_API = "https://api.crysnovax.workers.dev/files"; // endpoint returning repo files
const LICENSE_PATH = path.join("database", "license.json");

// ── LICENSE REGISTRATION ──────────────────────────────
async function registerIfNeeded() {
  if (fs.existsSync(LICENSE_PATH)) return;

  const hash = getCodeHash();
  const res = await axios.post(`${API}/register`, { hash });

  if (!fs.existsSync("database")) fs.mkdirSync("database", { recursive: true });
  fs.writeFileSync(LICENSE_PATH, JSON.stringify({ key: res.data.key }));
}

// ── RESTORE FILES FROM REPO ───────────────────────────
async function restoreFiles() {
  const res = await axios.get(REPO_API); // expects { "file/path.js": "content", ... }

  // ── DELETE EVERYTHING EXCEPT IGNORED ────────────────
  const IGNORE = [
    "node_modules",
    "sessions",
    ".env",
    "database/runtime-config.json",
    "database/user-config.json",
    "database/ai-memory.json",
    "src/Commands",
    ".log"
  ];

  const allFiles = getAllFiles("./");

  for (const file of allFiles) {
    if (!IGNORE.some(ignore => {
      // wildcard for directories
      if (ignore.endsWith("/*")) {
        const dir = ignore.slice(0, -2);
        return file.startsWith(path.join("./", dir));
      }
      // wildcard for logs
      if (ignore.startsWith("*.")) {
        return file.endsWith(ignore.slice(1));
      }
      return file.includes(ignore);
    })) {
      fs.unlinkSync(file);
    }
  }

  // ── RESTORE REPO FILES ──────────────────────────────
  for (const filePath in res.data) {
    const fullPath = path.join("./", filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, res.data[filePath]);
  }

  console.log("✅ All files restored from repo (ignored files preserved).");
}

// ── VERIFY LOOP WITH RAINBOW GLITCH ERROR ─────────────
const colors = ["\x1b[31m","\x1b[33m","\x1b[32m","\x1b[36m","\x1b[34m","\x1b[35m"];

async function verifyLoop() {
  if (!fs.existsSync(LICENSE_PATH)) return;

  const { key } = JSON.parse(fs.readFileSync(LICENSE_PATH));

  setInterval(async () => {
    const hash = getCodeHash();
    try {
      const res = await axios.post(`${API}/verify`, { key, hash });
      if (!res.data.ok) triggerKill();
    } catch (e) {
      triggerKill();
    }
  }, 20000);
}

// ── FULL CONSOLE RAINBOW GLITCH ───────────────────────
function triggerKill() {
  const lines = 30;
  let offset = 0;

  setInterval(() => {
    console.clear();
    for (let i = 0; i < lines; i++) {
      const color = colors[(i + offset) % colors.length];
      console.log(color + "🌈 CRYSNOVA AI ERROR 🌈".repeat(3) + "\x1b[0m");
    }
    offset = (offset + 1) % colors.length;
  }, 150);
}

// ── HELPER: RECURSIVE FILE LISTING ───────────────────
function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

// ── STARTUP ─────────────────────────────────────────
(async () => {
  await registerIfNeeded();
  await restoreFiles();
  verifyLoop();
})();

module.exports = { registerIfNeeded, verifyLoop };
