import { Router } from "express";
import { GetCalendarResponse } from "@workspace/api-zod";

const router = Router();

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

router.get("/", async (req, res): Promise<void> => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const todayISO = now.toISOString().split("T")[0];
  const tomorrowISO = tomorrow.toISOString().split("T")[0];

  const todayEvents = [
    { time: "09:00 AM", title: "Team Standup", duration: "30 min" },
    { time: "11:00 AM", title: "Product Review", duration: "1 hour" },
    { time: "02:00 PM", title: "1:1 with Manager", duration: "45 min" },
    { time: "04:00 PM", title: "Sprint Planning", duration: "2 hours" },
  ];

  const tomorrowEvents = [
    { time: "10:00 AM", title: "Design Sync", duration: "1 hour" },
    { time: "01:00 PM", title: "Stakeholder Presentation", duration: "1.5 hours" },
    { time: "03:30 PM", title: "Engineering Retrospective", duration: "1 hour" },
  ];

  res.json(
    GetCalendarResponse.parse({
      success: true,
      today: {
        date: todayISO,
        events: todayEvents,
      },
      tomorrow: {
        date: tomorrowISO,
        events: tomorrowEvents,
      },
    }),
  );
});

export default router;
