// license.js
const { getCodeHash } = require("./hash.js");
const fs = require("fs");
const path = require("path");

// Example storage for registration state
const LICENSE_FILE = path.join(__dirname, "license.json");

async function registerIfNeeded() {
    let data = {};
    if (fs.existsSync(LICENSE_FILE)) {
        data = JSON.parse(fs.readFileSync(LICENSE_FILE, "utf-8"));
    }

    // Compute current code hash
    const currentHash = getCodeHash();

    if (data.hash !== currentHash) {
        console.log("Registering code...");
        // Save new hash
        data.hash = currentHash;
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2));
    } else {
        console.log("Already registered.");
    }
}

function verifyLoop() {
    setInterval(() => {
        const currentHash = getCodeHash();
        const data = fs.existsSync(LICENSE_FILE)
            ? JSON.parse(fs.readFileSync(LICENSE_FILE, "utf-8"))
            : {};

        if (data.hash !== currentHash) {
            console.log("Code changed! Exiting...");
            process.exit(1);
        }
    }, 5000); // check every 5 seconds
}

module.exports = { registerIfNeeded, verifyLoop };
