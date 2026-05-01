import express, { type Express } from "express";
import cors from "cors";
import { type IncomingMessage, type ServerResponse } from "http";
import "./types"; // Type augmentation for pino-http
import router from "./routes";
import { logger } from "./lib/logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pinoHttpModule = require("pino-http");
const pinoHttp = (pinoHttpModule.default || pinoHttpModule) as (options: any) => any;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: string | number | object }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
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

export default app;
