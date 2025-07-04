#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// Get command line arguments
const args = process.argv.slice(2);
const logLevel = args[0] || "INFO";

// Available log levels
const validLogLevels = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

if (!validLogLevels.includes(logLevel.toUpperCase())) {
  console.error(`Invalid log level: ${logLevel}`);
  console.error(`Valid levels: ${validLogLevels.join(", ")}`);
  process.exit(1);
}

// Set environment variables
process.env.LOG_LEVEL = logLevel.toUpperCase();

// Enable specific log types based on log level
if (logLevel.toUpperCase() === "DEBUG" || logLevel.toUpperCase() === "TRACE") {
  process.env.ENABLE_PAYMENT_LOGS = "true";
  process.env.ENABLE_DB_LOGS = "true";
}

console.log(`🚀 Starting server with LOG_LEVEL=${logLevel.toUpperCase()}`);
console.log(
  `📝 Payment logs: ${
    process.env.ENABLE_PAYMENT_LOGS === "true" ? "ENABLED" : "DISABLED"
  }`
);
console.log(
  `🗄️  Database logs: ${
    process.env.ENABLE_DB_LOGS === "true" ? "ENABLED" : "DISABLED"
  }`
);
console.log("");

// Start the server
const server = spawn("node", ["index.js"], {
  stdio: "inherit",
  env: process.env,
});

server.on("close", (code) => {
  console.log(`\n👋 Server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  server.kill("SIGTERM");
});
