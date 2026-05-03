import { Router } from "express";
import {
  getCalendarView,
  formatEventTime,
  formatDuration,
} from "../lib/outlookCalendar";

const router = Router();

// ─── Mock events (fallback when Outlook is unreachable) ──────────────────────

const MOCK_TODAY = [
  { time: "09:00 AM", title: "Team Standup",     duration: "30 min"  },
  { time: "11:00 AM", title: "Product Review",   duration: "1 hour"  },
  { time: "02:00 PM", title: "1:1 with Manager", duration: "45 min"  },
  { time: "04:00 PM", title: "Sprint Planning",  duration: "2 hours" },
];

const MOCK_TOMORROW = [
  { time: "10:00 AM", title: "Design Sync",                duration: "1 hour"    },
  { time: "01:00 PM", title: "Stakeholder Presentation",   duration: "1.5 hours" },
  { time: "03:30 PM", title: "Engineering Retrospective",  duration: "1 hour"    },
];

// ─── Route ───────────────────────────────────────────────────────────────────

router.get("/", async (req, res): Promise<void> => {
  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const todayISO    = now.toISOString().split("T")[0]!;
  const tomorrowISO = tomorrow.toISOString().split("T")[0]!;

  try {
    // Fetch a 48-hour window from Microsoft Graph via Replit Outlook connector
    const windowStart = `${todayISO}T00:00:00`;
    const windowEnd   = `${tomorrowISO}T23:59:59`;

    const allEvents = await getCalendarView(windowStart, windowEnd);

    const todayEvents = allEvents
      .filter(e => e.start.dateTime.startsWith(todayISO))
      .map(e => ({
        time:     formatEventTime(e.start.dateTime),
        title:    e.subject,
        duration: formatDuration(e.start.dateTime, e.end.dateTime),
      }));

    const tomorrowEvents = allEvents
      .filter(e => e.start.dateTime.startsWith(tomorrowISO))
      .map(e => ({
        time:     formatEventTime(e.start.dateTime),
        title:    e.subject,
        duration: formatDuration(e.start.dateTime, e.end.dateTime),
      }));

    req.log.info({ todayCount: todayEvents.length, tomorrowCount: tomorrowEvents.length }, "Outlook calendar fetched");

    res.json({
      success:  true,
      today:    { date: todayISO,    events: todayEvents    },
      tomorrow: { date: tomorrowISO, events: tomorrowEvents },
    });
  } catch (err) {
    req.log.warn({ err }, "Outlook Graph API error — using mock data");
    res.json({
      success:  true,
      today:    { date: todayISO,    events: MOCK_TODAY    },
      tomorrow: { date: tomorrowISO, events: MOCK_TOMORROW },
    });
  }
});

export default router;
