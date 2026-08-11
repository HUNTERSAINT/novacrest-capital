import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static files from the api-server public directory (e.g. APK downloads).
// This runs in all environments so the APK route works both locally and in production.
const __dirnameStatic = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirnameStatic, "../public");
app.use(express.static(publicDir, { dotfiles: "ignore" }));

// Explicit route for the Android APK with correct MIME type and Content-Disposition.
app.get("/novacrest-capital.apk", (req: Request, res: Response) => {
  const apkPath = path.join(publicDir, "novacrest-capital.apk");
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="novacrest-capital.apk"',
  );
  res.sendFile(apkPath, (err) => {
    if (err) {
      res
        .status(404)
        .json({ error: "APK not available yet. Check back soon." });
    }
  });
});

// In production, serve the built React frontend as static files and handle SPA routing.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // The frontend build output is at artifacts/kingsaint/dist/public relative to repo root.
  // When running from repo root (Railway), go up from artifacts/api-server/dist/ to repo root.
  const frontendDist = path.resolve(__dirname, "../../../artifacts/kingsaint/dist/public");

  app.use(express.static(frontendDist));

  // SPA fallback — every non-API route returns index.html
  app.get("/*splat", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
