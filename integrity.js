// integrity.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PROTECTED_PATHS = [
    "crysnova.js",
    "library",
    "src/Plugin"
];

function getAllFilesInDir(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results = results.concat(getAllFilesInDir(fullPath));
            } else {
                results.push(fullPath);
            }
        }
    } catch (e) {}
    return results;
}

function getProtectedFiles() {
    let results = [];
    for (const p of PROTECTED_PATHS) {
        const fullPath = path.join(process.cwd(), p);
        if (!fs.existsSync(fullPath)) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(getAllFilesInDir(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

function getProtectedHash() {
    const files = getProtectedFiles();
    let content = "";

    for (const file of files) {
        try {
            content += fs.readFileSync(file, "utf8");
        } catch (e) {}
    }

    return crypto.createHash("sha256").update(content).digest("hex");
}

// Reset protected files to original from git on startup
function resetProtectedFiles() {
    console.log("🔄 Resetting protected files to repo state...");

    try {
        for (const p of PROTECTED_PATHS) {
            execSync(`git checkout -- "${p}" 2>/dev/null || true`, { stdio: "ignore" });
            execSync(`git restore "${p}" 2>/dev/null || true`, { stdio: "ignore" });
        }
        console.log("✅ Protected files reset successfully.");
    } catch (err) {
        console.error("⚠️ Could not reset some files:", err.message);
    }
}

module.exports = { getProtectedHash, resetProtectedFiles };