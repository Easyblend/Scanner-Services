import express, {
  Request,
  Response,
} from "express";
import { scanWebsite } from "./scanner/scanner";

const app = express();

const PORT = Number(process.env.PORT) || 8080;

const SCANNER_SECRET = process.env.SCANNER_SECRET;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "crowdtest-scanner",
  });
});

app.post("/scan", async (req: Request, res: Response) => {

  const authorization = req.headers.authorization;

  try {

    if (
      !SCANNER_SECRET ||
      authorization !== `Bearer ${SCANNER_SECRET}`
    ) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized.",
      });
    }

    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        success: false,
        error: "A valid URL is required.",
      });
    }

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({
          success: false,
          error: "Only HTTP and HTTPS URLs are supported.",
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL.",
      });
    }

    console.log(`🔍 Scan requested: ${url}`);

    const result = await scanWebsite(url);

    console.log(
      `✅ Scan completed: ${result.pagesScanned} pages, ` +
      `${result.findings.length} findings`
    );

    return res.json({
      success: true,
      url,
      ...result,
    });
  } catch (error) {
    console.error("Scanner error:", error);

    return res.status(500).json({
      success: false,
      error: "Scanner failed.",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 CrowdTest Scanner listening on port ${PORT}`
  );
});