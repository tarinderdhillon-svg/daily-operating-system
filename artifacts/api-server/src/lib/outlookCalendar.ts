/**
 * Microsoft Outlook Calendar via direct Microsoft Graph API.
 * Auth: refresh-token flow — exchange MICROSOFT_REFRESH_TOKEN for a short-lived
 * access token on each request.
 *
 * Required Vercel env vars:
 *   MICROSOFT_CLIENT_ID     — Azure AD app registration client ID
 *   MICROSOFT_CLIENT_SECRET — Azure AD app registration secret
 *   MICROSOFT_REFRESH_TOKEN — long-lived refresh token (personal account or work/school)
 *   MICROSOFT_TENANT_ID     — tenant ID or "common" / "consumers" (default: "common")
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

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN;
  const tenantId     = process.env.MICROSOFT_TENANT_ID ?? "common";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Microsoft Graph credentials not configured. " +
      "Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_REFRESH_TOKEN in Vercel env vars."
    );
  }

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope:         "https://graph.microsoft.com/Calendars.Read offline_access",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Microsoft token refresh failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Fetch calendar events for a date range from Microsoft Graph.
 * startDateTime / endDateTime: ISO strings like "2026-04-11T00:00:00"
 */
export async function getCalendarView(
  startDateTime: string,
  endDateTime:   string,
  timeZone = "Europe/London",
): Promise<GraphCalendarEvent[]> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    "$select":  "subject,start,end,location,isAllDay,isCancelled",
    "$orderby": "start/dateTime asc",
    "$top":     "50",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer:        `outlook.timezone="${timeZone}"`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Microsoft Graph error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { value: GraphCalendarEvent[] };
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
