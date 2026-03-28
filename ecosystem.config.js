// CRYSNOVA_AI/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "CRYSNOVA_AI",
      script: "index.js",           // Your main bot file
      instances: "max",             // Use all CPU cores
      exec_mode: "cluster",         // Better performance & stability
      watch: false,                 // Don't auto-restart on file changes in production
      max_memory_restart: "600M",   // Restart if memory gets too high
      autorestart: true,            // Auto restart on crash
      env: {
        NODE_ENV: "production"
      },
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
