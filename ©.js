const axios = require("axios");
const fs    = require("fs");
const path  = require("path");
const { getCodeHash } = require("./hash");

const API          = "https://api.crysnovax.workers.dev";
const REPO_API     = "https://api.crysnovax.workers.dev/files";
const LICENSE_PATH = path.join("database", "license.json");

let botCorrupted = false;

// ── Hash cached once per restart ──────────────────
let cachedHash = null;

function getHash() {
    if (!cachedHash) {
        cachedHash = getCodeHash();
        console.log("\x1b[36m[©] Hash computed.\x1b[0m");
    }
    return cachedHash;
}

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

// ── LICENSE ────────────────────────────────────────
async function registerIfNeeded() {
    if (fs.existsSync(LICENSE_PATH)) return;
    const hash = getHash();
    const res  = await axios.post(`${API}/register`, { hash });
    if (!fs.existsSync("database")) fs.mkdirSync("database", { recursive: true });
    fs.writeFileSync(LICENSE_PATH, JSON.stringify({ key: res.data.key }));
    console.log("\x1b[32m[©] Registered.\x1b[0m");
}

// ── RESTORE FILES ──────────────────────────────────
async function restoreFiles() {
    try {
        const res = await axios.get(REPO_API, { timeout: 30000 });
        if (!res.data || typeof res.data !== "object") return;

        const allFiles = getAllFiles("./");

        for (const file of allFiles) {
            const skip = IGNORE.some(ignore => {
                if (ignore.endsWith("/*"))   return file.startsWith(path.join("./", ignore.slice(0, -2)));
                if (ignore.startsWith("*.")) return file.endsWith(ignore.slice(1));
                return file.includes(ignore);
            });
            if (!skip) fs.unlinkSync(file);
        }

        for (const filePath in res.data) {
            const content = res.data[filePath];
            if (typeof content !== "string") continue;
            const fullPath = path.join("./", filePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
        }

        console.log("\x1b[32m[©] Files restored.\x1b[0m");

        // Files changed — invalidate and recompute hash once
        cachedHash = null;
        await syncHash();

    } catch (err) {
        console.error("\x1b[33m[©] Restore skipped (network?):\x1b[0m", err.message);
    }
}

// ── SYNC HASH ──────────────────────────────────────
async function syncHash() {
    try {
        if (!fs.existsSync(LICENSE_PATH)) return;
        const { key } = JSON.parse(fs.readFileSync(LICENSE_PATH));
        await axios.post(`${API}/sync`, { key, hash: getHash() });
        console.log("\x1b[32m[©] Hash synced.\x1b[0m");
    } catch {
        // Silent
    }
}

// ── VERIFY LOOP ────────────────────────────────────
async function verifyLoop() {
    if (!fs.existsSync(LICENSE_PATH)) return;
    const { key } = JSON.parse(fs.readFileSync(LICENSE_PATH));

    setInterval(async () => {
        if (botCorrupted) return;
        try {
            // Uses cached hash — no recompute on every tick
            const res = await axios.post(`${API}/verify`, { key, hash: getHash() });
            if (res.data && res.data.ok === false) {
                console.log("\x1b[31m[©] Integrity check failed.\x1b[0m");
                triggerKill();
            }
        } catch {
            // Network blip — skip silently
        }
    }, 20000);
}

// ── CORRUPT BOT ────────────────────────────────────
function triggerKill() {
    botCorrupted = true;

    const colors = ["\x1b[31m", "\x1b[33m", "\x1b[32m", "\x1b[36m", "\x1b[34m", "\x1b[35m",
                    "\x1b[91m", "\x1b[93m", "\x1b[92m", "\x1b[96m", "\x1b[94m", "\x1b[95m"];
    const reset  = "\x1b[0m";
    const bold   = "\x1b[1m";
    const cols   = process.stdout.columns || 80;
    const line   = "█".repeat(cols);
    let   offset = 0;

    process.on("SIGINT",  () => {});
    process.on("SIGTERM", () => {});
    process.on("SIGHUP",  () => {});

    setInterval(() => {
        console.clear();
        const rows = process.stdout.rows || 30;
        for (let i = 0; i < rows; i++) {
            const color = colors[(i + offset) % colors.length];
            const half  = Math.floor((cols - 22) / 2);
            const pad   = " ".repeat(Math.max(0, half));
            if (i % 4 === 0) {
                process.stdout.write(`${color}${bold}${line}${reset}\n`);
            } else {
                process.stdout.write(`${color}${bold}${pad}🌈 CRYSNOVA AI ERROR 🌈${pad}${reset}\n`);
            }
        }
        offset = (offset + 1) % colors.length;
    }, 150);
}

// ── CHECK CORRUPTED ────────────────────────────────
function checkCorrupted() {
    if (botCorrupted) throw new Error("CRYSNOVA BOT CORRUPTED: Cannot execute commands.");
}

// ── HELPERS ───────────────────────────────────────
function getAllFiles(dir) {
    let results = [];
    const list  = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat     = fs.statSync(fullPath);
        if (stat.isDirectory()) results = results.concat(getAllFiles(fullPath));
        else results.push(fullPath);
    }
    return results;
}

// ── STARTUP ───────────────────────────────────────
(async () => {
    await registerIfNeeded();
    await restoreFiles();   // restore → recomputes + syncs hash
    verifyLoop();           // all ticks reuse the same cached hash
})();

module.exports = { registerIfNeeded, verifyLoop, checkCorrupted };
        
