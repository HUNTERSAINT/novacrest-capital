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

// In production, serve the built React frontend as static files and handle SPA routing.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // The frontend build output is at artifacts/kingsaint/dist/public relative to repo root.
  // When running from repo root (Railway), go up from artifacts/api-server/dist/ to repo root.
  const frontendDist = path.resolve(__dirname, "../../../artifacts/kingsaint/dist/public");

  app.use(express.static(frontendDist));

  // SPA fallback — every non-API route returns index.html
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
