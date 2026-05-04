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
// In Vercel, files are bundled to dist/public, so we need to look there
const publicPath = path.join(process.cwd(), "dist", "public");
app.use(express.static(publicPath));

// API routes
app.use("/api", router);

// Serve index.html for root path (SPA routing simplified)
app.get("/", (req, res) => {
  const indexPath = path.join(publicPath, "index.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(indexPath);
});

// Note: SPA routing for non-API paths removed temporarily to fix route pattern issue
// Static files are served via express.static() above, which handles /script.js, /styles.css, etc.

export default app;
