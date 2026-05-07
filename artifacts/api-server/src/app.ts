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
// __dirname is dist/ after build, so public is at dist/public
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath, {
  maxAge: "1d",
  etag: false,
}));

// API routes
app.use("/api", router);

// SPA fallback: serve index.html for non-API routes
// This handles client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

export default app;
