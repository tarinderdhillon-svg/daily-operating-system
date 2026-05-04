import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const NOTION_API_KEY = process.env.NOTION_API_KEY || "";
const NOTION_PROJECTS_DB = process.env.PROJECTS_PAGE_ID || "";
const NOTION_VERSION = "2022-06-28";

type HttpResponse = { json(): Promise<unknown>; ok: boolean; status: number };

async function notionRequest<T = unknown>(path: string, method = "GET", body?: object): Promise<T> {
  const url = `https://api.notion.com/v1${path}`;
  const httpRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as HttpResponse;
  const json = (await httpRes.json()) as T;
  if (!(httpRes as unknown as { ok: boolean }).ok) {
    throw new Error(`Notion API error ${(httpRes as unknown as { status: number }).status}: ${JSON.stringify(json)}`);
  }
  return json;
}

router.get("/", async (_req, res): Promise<void> => {
  try {
    const data = await notionRequest<{
      results: Array<{ id: string; properties: { Name?: { title: Array<{ plain_text: string }> } } }>;
    }>(`/databases/${NOTION_PROJECTS_DB}/query`, "POST", {
      page_size: 50,
      sorts: [{ property: "Name", direction: "ascending" }],
    });
    const projects = data.results.map(p => ({
      id: p.id,
      name: p.properties?.Name?.title?.map(t => t.plain_text).join("") ?? "Untitled",
    }));
    res.json({ projects });
  } catch (err) {
    logger.error({ err }, "Failed to fetch projects");
    res.status(500).json({ projects: [] });
  }
});

export default router;
