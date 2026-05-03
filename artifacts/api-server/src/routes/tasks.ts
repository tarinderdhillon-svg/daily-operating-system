import { Router } from "express";
import {
  GetTasksResponse,
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

const NOTION_API_KEY = process.env.NOTION_API_KEY || "";
const NOTION_DB_ID   = process.env.TASKS_PAGE_ID || "";
const NOTION_PROJECTS_DB = process.env.PROJECTS_PAGE_ID || "";
const NOTION_VERSION = "2022-06-28";
const DONE_STATUSES  = new Set(["done", "complete", "completed"]);
const DHILLON_USER_ID = "335d872b-594c-8135-92ba-0002f74d1f33";

interface NotionTask {
  id: string;
  properties: {
    Name?: { title: Array<{ plain_text: string }> };
    "Due Date"?: { date: { start: string } | null };
    Priority?: { select: { name: string } | null };
    Status?: { status: { name: string } | null };
    Notes?: { rich_text: Array<{ plain_text: string }> };
    "Related Project"?: { relation: Array<{ id: string }> };
  };
}

function parseTask(page: NotionTask) {
  const title      = page.properties?.Name?.title?.map((t) => t.plain_text).join("") ?? "";
  const due_date   = page.properties?.["Due Date"]?.date?.start ?? null;
  const priority   = (page.properties?.Priority?.select?.name as "Urgent" | "High" | "Medium" | "Low" | null) ?? null;
  const status     = page.properties?.Status?.status?.name ?? null;
  const notes      = page.properties?.Notes?.rich_text?.map((t) => t.plain_text).join("") || null;
  const project_id = page.properties?.["Related Project"]?.relation?.[0]?.id ?? null;
  return { id: page.id, title, due_date, priority, status, notes, project_id };
}

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
  });
  const json = (await httpRes.json()) as T;
  if (!httpRes.ok) throw new Error(`Notion API error ${httpRes.status}: ${JSON.stringify(json)}`);
  return json;
}

router.get("/projects", async (req, res): Promise<void> => {
  try {
    const data = await notionRequest<{ results: Array<{ id: string; properties: { Name?: { title: Array<{ plain_text: string }> } } }> }>(`/databases/${NOTION_PROJECTS_DB}/query`, "POST", {
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

router.get("/", async (req, res): Promise<void> => {
  try {
    const data = await notionRequest<{ results: NotionTask[] }>(`/databases/${NOTION_DB_ID}/query`, "POST", {
      page_size: 100,
      sorts: [{ property: "Due Date", direction: "ascending" }],
    });

    const allTasks = data.results.map(parseTask);
    const completed  = allTasks.filter(t => DONE_STATUSES.has((t.status ?? "").toLowerCase()));
    const activeTasks = allTasks.filter(t => !DONE_STATUSES.has((t.status ?? "").toLowerCase()));

    const today   = new Date(); today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    const overdue:     typeof activeTasks = [];
    const outstanding: typeof activeTasks = [];
    const inProgress:  typeof activeTasks = [];
    const inReview:    typeof activeTasks = [];
    const todo:        typeof activeTasks = [];

    for (const task of activeTasks) {
      const statusLower = (task.status ?? "").toLowerCase();
      if (statusLower === "in progress") { inProgress.push(task); continue; }
      if (statusLower === "in review")   { inReview.push(task);   continue; }
      if (task.due_date) {
        const d = new Date(task.due_date); d.setHours(0, 0, 0, 0);
        if (d < today)    { overdue.push(task);     continue; }
        if (d <= nextWeek){ outstanding.push(task); continue; }
      }
      todo.push(task);
    }

    res.json(
      GetTasksResponse.parse({
        success: true,
        tasks: activeTasks,
        categorized: { overdue, outstanding, inProgress, todo },
        completed,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch tasks");
    res.status(500).json({ success: false, error: "Failed to fetch tasks" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }

  const { title, due_date, priority, status, notes } = parsed.data;
  const project_id = req.body.project_id as string | undefined;

  try {
    const properties: Record<string, unknown> = {
      Name:   { title: [{ text: { content: title } }] },
      Status: { status: { name: status ?? "Not started" } },
      Owner:  { people: [{ id: DHILLON_USER_ID }] },
    };
    if (due_date)    properties["Due Date"]        = { date: { start: due_date } };
    if (priority)    properties["Priority"]        = { select: { name: priority } };
    if (notes)       properties["Notes"]           = { rich_text: [{ text: { content: notes } }] };
    if (project_id)  properties["Related Project"] = { relation: [{ id: project_id }] };

    const page = await notionRequest<{ id: string }>("/pages", "POST", {
      parent: { database_id: NOTION_DB_ID },
      properties,
    });

    res.json({ success: true, message: "Task created successfully", task_id: page.id });
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ success: false, error: "Failed to create task", message: "Failed to create task" });
  }
});

router.patch("/:taskId", async (req, res): Promise<void> => {
  const paramsParsed = UpdateTaskParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ success: false, error: "Invalid task ID", message: "Invalid task ID" });
    return;
  }

  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ success: false, error: bodyParsed.error.message, message: bodyParsed.error.message });
    return;
  }

  const { taskId } = paramsParsed.data;
  const { title, status, priority, due_date, notes } = bodyParsed.data;
  const project_id = req.body.project_id as string | null | undefined;

  try {
    const properties: Record<string, unknown> = {};
    if (title    != null) properties["Name"]     = { title: [{ text: { content: title } }] };
    if (status   != null) properties["Status"]   = { status: { name: status } };
    if (priority != null) properties["Priority"] = { select: { name: priority } };
    if (due_date != null) properties["Due Date"] = { date: { start: due_date } };
    else if (due_date === null && "due_date" in bodyParsed.data) properties["Due Date"] = { date: null };
    if (notes    != null) properties["Notes"]    = { rich_text: [{ text: { content: notes } }] };
    if (project_id !== undefined) {
      properties["Related Project"] = project_id
        ? { relation: [{ id: project_id }] }
        : { relation: [] };
    }

    await notionRequest(`/pages/${taskId}`, "PATCH", { properties });
    res.json({ success: true, message: "Task updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ success: false, error: "Failed to update task", message: "Failed to update task" });
  }
});

router.delete("/:taskId", async (req, res): Promise<void> => {
  const paramsParsed = DeleteTaskParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ success: false, error: "Invalid task ID", message: "Invalid task ID" });
    return;
  }

  const { taskId } = paramsParsed.data;
  try {
    await notionRequest(`/pages/${taskId}`, "PATCH", { archived: true });
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ success: false, error: "Failed to delete task", message: "Failed to delete task" });
  }
});

export default router;
