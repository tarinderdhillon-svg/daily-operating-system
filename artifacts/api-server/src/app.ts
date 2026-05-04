import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import "./types"; // Type augmentation for pino-http
import router from "./routes";
import { logger } from "./lib/logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const pinoHttp = require("pino-http") as any;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
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

// Serve static files from public directory
// Use __dirname for reliable path in serverless environments
// After esbuild, the structure is: dist/index.js and dist/public/
const publicPath = path.join(__dirname || process.cwd(), "public");
logger.info({ publicPath }, "Serving static files from:");
app.use(express.static(publicPath, {
  maxAge: '1h',
  redirect: false
}));

// API routes
app.use("/api", router);

// Serve index.html for root path (SPA fallback)
app.get("/", (_req, res) => {
  const indexPath = path.join(publicPath, "index.html");
  res.sendFile(indexPath);
});

// Note: SPA routing removed to fix Express v5 path-to-regexp errors
// Static files are served via express.static() above, which handles /script.js, /styles.css, /index.html, etc.

export default app;
