import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { getLearningHistory, selectNextConcept, generateLesson, saveToNotion } from "./routes/learning";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  cron.schedule(
    "30 5 * * *",
    async () => {
      logger.info("⏰ Daily learning scheduler triggered (5:30 AM UK time)");
      try {
        const history = await getLearningHistory();
        const concept = selectNextConcept(history);
        const lesson = await generateLesson(concept);
        await saveToNotion(concept, lesson, false);
        logger.info({ concept: concept.name }, "✅ Daily lesson auto-generated and saved to Notion");
      } catch (err) {
        logger.error({ err }, "❌ Daily learning scheduler failed");
      }
    },
    { timezone: "Europe/London" }
  );

  logger.info("📅 Daily learning scheduler registered — fires at 5:30 AM UK time");
});
