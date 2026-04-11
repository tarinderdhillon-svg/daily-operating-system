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

const NOTION_API_KEY = "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";
const NOTION_DB_ID = "3356990a287981128f2ffe49ada5e44f";
const NOTION_VERSION = "2022-06-28";

interface NotionTask {
  id: string;
  properties: {
    Name?: { title: Array<{ plain_text: string }> };
    "Due Date"?: { date: { start: string } | null };
    Priority?: { select: { name: string } | null };
    Status?: { status: { name: string } | null };
  };
}

function parseTask(page: NotionTask) {
  const title =
    page.properties?.Name?.title?.map((t) => t.plain_text).join("") ?? "";
  const due_date = page.properties?.["Due Date"]?.date?.start ?? null;
  const priority =
    (page.properties?.Priority?.select?.name as
      | "High"
      | "Medium"
      | "Low"
      | null) ?? null;
  const status = page.properties?.Status?.status?.name ?? null;
  return { id: page.id, title, due_date, priority, status };
}

async function notionRequest(
  path: string,
  method: string = "GET",
  body?: object,
) {
  const url = `https://api.notion.com/v1${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Notion API error ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  return json;
}

router.get("/", async (req, res): Promise<void> => {
  try {
    const data = await notionRequest(`/databases/${NOTION_DB_ID}/query`, "POST", {
      page_size: 100,
    });

    const tasks = (data.results as NotionTask[]).map(parseTask);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const overdue: typeof tasks = [];
    const outstanding: typeof tasks = [];
    const todo: typeof tasks = [];

    for (const task of tasks) {
      if (!task.due_date) {
        todo.push(task);
        continue;
      }
      const d = new Date(task.due_date);
      d.setHours(0, 0, 0, 0);
      if (d < today) {
        overdue.push(task);
      } else if (d <= nextWeek) {
        outstanding.push(task);
      } else {
        todo.push(task);
      }
    }

    res.json(
      GetTasksResponse.parse({
        success: true,
        tasks,
        categorized: { overdue, outstanding, todo },
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

  const { title, due_date, priority } = parsed.data;

  try {
    const properties: Record<string, unknown> = {
      Name: { title: [{ text: { content: title } }] },
      Status: { status: { name: "Not started" } },
    };

    if (due_date) {
      properties["Due Date"] = { date: { start: due_date } };
    }

    if (priority) {
      properties["Priority"] = { select: { name: priority } };
    }

    const page = await notionRequest("/pages", "POST", {
      parent: { database_id: NOTION_DB_ID },
      properties,
    });

    res.json({
      success: true,
      message: "Task created successfully",
      task_id: page.id,
    });
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
  const { title, status, priority, due_date } = bodyParsed.data;

  try {
    const properties: Record<string, unknown> = {};

    if (title !== undefined && title !== null) {
      properties["Name"] = { title: [{ text: { content: title } }] };
    }
    if (status !== undefined && status !== null) {
      properties["Status"] = { status: { name: status } };
    }
    if (priority !== undefined && priority !== null) {
      properties["Priority"] = { select: { name: priority } };
    }
    if (due_date !== undefined && due_date !== null) {
      properties["Due Date"] = { date: { start: due_date } };
    } else if (due_date === null && "due_date" in bodyParsed.data) {
      properties["Due Date"] = { date: null };
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
