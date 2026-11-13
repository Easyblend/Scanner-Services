import express from "express";
import { startScanWorker } from "./messaging/consumer";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "crowdtest-scanner",
    "uptime": process.uptime(),
    "timestamp": new Date().toISOString(),
    "pid": process.pid,
    "node_version": process.version,
    "platform": process.platform,
    "arch": process.arch,
    "memory_usage": process.memoryUsage(),
    "cpu_usage": process.cpuUsage(),
  });
});

async function start() {
  await startScanWorker();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Scanner worker listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start scanner:", error);
  process.exit(1);
});