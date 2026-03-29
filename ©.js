const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getCodeHash } = require("./hash");

const API = "https://api.crysnovax.workers.dev";
const REPO_API = "https://api.crysnovax.workers.dev/files";
const LICENSE_PATH = path.join("database", "license.json");

let botCorrupted = false;

// ── IGNORE CONFIG & ASSETS ─────────────────────────
const IGNORE = [
  "node_modules",
  "sessions",
  ".env",
  "settings/config.js
  "database/runtime-config.json",
  "database/user-config.json",
  "database/ai-memory.json",
  "src/assets/",
  ".log"
];

// ── LICENSE ────────────────────────────────────────
async function registerIfNeeded() {
  if (fs.existsSync(LICENSE_PATH)) return;
  const hash = getCodeHash();
  const res = await axios.post(`${API}/register`, { hash });
  if (!fs.existsSync("database")) fs.mkdirSync("database", { recursive: true });
  fs.writeFileSync(LICENSE_PATH, JSON.stringify({ key: res.data.key }));
}

// ── RESTORE FILES ──────────────────────────────────
async function restoreFiles() {
  const res = await axios.get(REPO_API);
  if (!res.data || typeof res.data !== "object") return;

  const allFiles = getAllFiles("./");

  for (const file of allFiles) {
    // skip ignored files
    if (!IGNORE.some(ignore => {
      if (ignore.endsWith("/*")) return file.startsWith(path.join("./", ignore.slice(0, -2)));
      if (ignore.startsWith("*.")) return file.endsWith(ignore.slice(1));
      return file.includes(ignore);
    })) {
      fs.unlinkSync(file); // delete anything outside ignored paths
    }
  }

  // restore all files from repo
  for (const filePath in res.data) {
    const content = res.data[filePath];
    if (typeof content !== "string") continue;
    const fullPath = path.join("./", filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

// ── VERIFY LOOP ────────────────────────────────────
const colors = ["\x1b[31m","\x1b[33m","\x1b[32m","\x1b[36m","\x1b[34m","\x1b[35m"];

async function verifyLoop() {
  if (!fs.existsSync(LICENSE_PATH)) return;
  const { key } = JSON.parse(fs.readFileSync(LICENSE_PATH));

  setInterval(async () => {
    if (botCorrupted) return;
    const hash = getCodeHash();
    try {
      const res = await axios.post(`${API}/verify`, { key, hash });
      if (!res.data.ok) triggerKill(); // only triggers if hash mismatch
    } catch (e) {
      triggerKill();
    }
  }, 20000);
}

// ── CORRUPT BOT ───────────────────────────────────
function triggerKill() {
  botCorrupted = true;
  const lines = process.stdout.rows || 30;
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

// ── HELPERS ───────────────────────────────────────
function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) results = results.concat(getAllFiles(fullPath));
    else results.push(fullPath);
  }
  return results;
}

function checkCorrupted() {
  if (botCorrupted) throw new Error("CRYSNOVA BOT CORRUPTED: Cannot execute commands.");
}

// ── STARTUP ───────────────────────────────────────
(async () => {
  await registerIfNeeded();
  await restoreFiles(); // always restores core code from repo
  verifyLoop();
})();

module.exports = { registerIfNeeded, verifyLoop, checkCorrupted };
