import express from "express";
import { startScanWorker } from "./messaging/consumer";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "crowdtest-scanner",
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