/**
 * Microsoft Outlook Calendar via Microsoft Graph API.
 * This file is wired up after the user completes the OAuth flow via the Replit Outlook connector.
 * The getOutlookClient function is replaced by the Replit connector snippet once OAuth is set up.
 */

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
 * Returns the current Outlook access token from the Replit connector.
 * This is populated by the Replit Outlook integration after OAuth setup.
 * Returns null when Outlook is not yet connected.
 */
let _getOutlookToken: (() => Promise<string | null>) | null = null;

export function registerOutlookTokenProvider(fn: () => Promise<string | null>) {
  _getOutlookToken = fn;
}

export function isOutlookConnected(): boolean {
  return _getOutlookToken !== null;
}

/**
 * Fetch calendar events for a date range from Microsoft Graph.
 */
export async function getCalendarView(
  startDateTime: string,
  endDateTime: string,
  timeZone = "UTC",
): Promise<GraphCalendarEvent[]> {
  if (!_getOutlookToken) return [];

  const token = await _getOutlookToken();
  if (!token) return [];

  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    "$select": "subject,start,end,location,isAllDay,isCancelled",
    "$orderby": "start/dateTime asc",
    "$top": "50",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `outlook.timezone="${timeZone}"`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph API error ${response.status}: ${body}`);
  }

  const data = await response.json() as { value: GraphCalendarEvent[] };
  return (data.value ?? []).filter(e => !e.isCancelled);
}

/**
 * Format a Graph API datetime string into a user-friendly time (e.g. "9:00 AM").
 */
export function formatEventTime(dateTimeStr: string): string {
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
}

/**
 * Calculate duration string between two datetimes (e.g. "1 hour", "45 min").
 */
export function formatDuration(startStr: string, endStr: string): string {
  try {
    const startMs = new Date(startStr).getTime();
    const endMs   = new Date(endStr).getTime();
    const diffMin = Math.round((endMs - startMs) / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins  = diffMin % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${hours}h ${mins}m`;
  } catch {
    return "";
  }
}
