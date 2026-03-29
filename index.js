// index.js   ← This is the file you will run with "node index.js"

const { initProtection, startTamperMonitor, isBotDisabled } = require("./protection.js");

(async () => {
    try {
        console.log("🛡️ Starting anti-tamper protection...");

        await initProtection();        // Resets crysnova.js, library/, src/Plugin/ to repo state
        startTamperMonitor();          // Monitors for edits

        console.log("✅ Protection activated.");

        // Now load your main bot exactly like you wanted
        console.log("🚀 Loading crysnova.js ...");
        require("./crysnova.js");

    } catch (err) {
        console.error("❌ Protection failed:", err.message);
        process.exit(1);
    }
})();
