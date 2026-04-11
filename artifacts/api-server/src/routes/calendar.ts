import { Router } from "express";
import { GetCalendarResponse } from "@workspace/api-zod";
import {
  getCalendarView,
  formatEventTime,
  formatDuration,
  isOutlookConnected,
  registerOutlookTokenProvider,
} from "../lib/outlookCalendar";

const router = Router();

// ─── Outlook connector token provider ────────────────────────────────────────
// This block is populated after the Replit Outlook OAuth connector is set up.
// Until then, isOutlookConnected() returns false and we fall back to mock data.
// After OAuth: replace this stub with the Replit connector code snippet.
// ─────────────────────────────────────────────────────────────────────────────

// registerOutlookTokenProvider(async () => {
//   const client = await getUncachableOutlookClient();
//   return client?.accessToken ?? null;
// });

// ─── Mock events (used when Outlook is not connected) ────────────────────────

const MOCK_TODAY = [
  { time: "09:00 AM", title: "Team Standup",        duration: "30 min"   },
  { time: "11:00 AM", title: "Product Review",      duration: "1 hour"   },
  { time: "02:00 PM", title: "1:1 with Manager",    duration: "45 min"   },
  { time: "04:00 PM", title: "Sprint Planning",     duration: "2 hours"  },
];

const MOCK_TOMORROW = [
  { time: "10:00 AM", title: "Design Sync",                   duration: "1 hour"    },
  { time: "01:00 PM", title: "Stakeholder Presentation",      duration: "1.5 hours" },
  { time: "03:30 PM", title: "Engineering Retrospective",     duration: "1 hour"    },
];

// ─── Route ────────────────────────────────────────────────────────────────────

router.get("/", async (req, res): Promise<void> => {
  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const todayISO    = now.toISOString().split("T")[0];
  const tomorrowISO = tomorrow.toISOString().split("T")[0];

  if (isOutlookConnected()) {
    try {
      // Pull a 2-day window from Microsoft Graph
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

      res.json(GetCalendarResponse.parse({
        success: true,
        today:    { date: todayISO,    events: todayEvents    },
        tomorrow: { date: tomorrowISO, events: tomorrowEvents },
      }));
      return;
    } catch (err) {
      req.log.error({ err }, "Outlook Graph API error — falling back to mock data");
      // fall through to mock data below
    }
  }

  // ── Fallback: mock data ───────────────────────────────────────────────────
  res.json(GetCalendarResponse.parse({
    success: true,
    today:    { date: todayISO,    events: MOCK_TODAY    },
    tomorrow: { date: tomorrowISO, events: MOCK_TOMORROW },
  }));
});

export default router;
