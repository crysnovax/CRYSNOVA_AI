const { registerIfNeeded, verifyLoop } = require("./©.js");

(async () => {
  await registerIfNeeded();
  verifyLoop();

  // load your obfuscated bot
  require("./crysnova.js");
})();
