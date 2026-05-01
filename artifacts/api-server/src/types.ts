import type { Logger } from "pino";
import "express";

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      allLogs: Logger[];
    }
    interface Response {
      err?: Error;
    }
  }
}
