// protection.js
const { getProtectedHash, resetProtectedFiles } = require("./integrity.js");
const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "protection-state.json");

let isTampered = false;

async function initProtection() {
    // 1. Reset files on every restart
    resetProtectedFiles();

    // 2. Save current clean hash
    const currentHash = getProtectedHash();

    const data = { hash: currentHash, lastReset: Date.now() };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));

    console.log("🛡️ Protection initialized - Protected files are clean.");
}

function startTamperMonitor() {
    setInterval(() => {
        if (isTampered) return;

        const currentHash = getProtectedHash();

        let savedHash = "";
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
                savedHash = data.hash || "";
            }
        } catch (e) {}

        if (savedHash && currentHash !== savedHash) {
            console.log("⚠️ TAMPER DETECTED in crysnova.js, library/, or src/Plugin/ !");
            isTampered = true;
            // Bot stays connected but stops responding
        }
    }, 7000); // Check every 7 seconds
}

function isBotDisabled() {
    return isTampered;
}

module.exports = {
    initProtection,
    startTamperMonitor,
    isBotDisabled
};