/**
 * Microsoft Outlook Calendar via Replit Connectors SDK + Microsoft Graph.
 * Uses @replit/connectors-sdk — tokens are refreshed automatically.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

type HttpResponse = { ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> };

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end:   { dateTime: string; timeZone: string };
  location?: { displayName?: string } | null;
  isAllDay?: boolean;
  isCancelled?: boolean;
}

/**
 * Fetch calendar events for a date range from Microsoft Graph via the Replit proxy.
 * startDateTime / endDateTime should be ISO strings like "2026-04-11T00:00:00"
 */
export async function getCalendarView(
  startDateTime: string,
  endDateTime:   string,
  timeZone = "Europe/London",
): Promise<GraphCalendarEvent[]> {
  // Create a fresh client per call — tokens may expire
  const connectors = new ReplitConnectors();

  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    "$select":  "subject,start,end,location,isAllDay,isCancelled",
    "$orderby": "start/dateTime asc",
    "$top":     "50",
  });

  const endpoint = `/v1.0/me/calendarView?${params}`;

  const response = await connectors.proxy("outlook", endpoint, {
    method: "GET",
    headers: { Prefer: `outlook.timezone="${timeZone}"` },
  }) as HttpResponse;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { value: GraphCalendarEvent[] };
  return (data.value ?? []).filter((e) => !e.isCancelled);
}

/** Format a Graph datetime string → "9:00 AM" */
export function formatEventTime(dateTimeStr: string): string {
  try {
    return new Date(dateTimeStr).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
}

/** Duration between two datetimes → "1 hour", "45 min" */
export function formatDuration(startStr: string, endStr: string): string {
  try {
    const diffMin = Math.round(
      (new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000,
    );
    if (diffMin < 60) return `${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins  = diffMin % 60;
    if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
    return `${hours}h ${mins}m`;
  } catch {
    return "";
  }
}
