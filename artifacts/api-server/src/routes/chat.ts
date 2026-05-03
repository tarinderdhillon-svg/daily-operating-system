import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProcessChatBody } from "@workspace/api-zod";

const router = Router();

const NOTION_API_KEY    = "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";
const NOTION_DB_ID      = "3356990a287981128f2ffe49ada5e44f";
const NOTION_PROJECTS_DB = "3356990a-2879-8110-9d8f-db6ed7291219";
const NOTION_VERSION    = "2022-06-28";
const GEMINI_MODEL      = "gemini-2.5-flash-lite";  // cheapest capable Gemini model
const DHILLON_USER_ID   = "335d872b-594c-8135-92ba-0002f74d1f33";

const TODAY = () => new Date().toISOString().split("T")[0];

function getGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
}

async function geminiGenerate(prompt: string): Promise<string> {
  const model = getGemini();
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

const VALID_STATUSES: Record<string, string> = {
  "in progress":  "In progress",
  "inprogress":   "In progress",
  "in-progress":  "In progress",
  "not started":  "Not started",
  "notstarted":   "Not started",
  "not-started":  "Not started",
  "in review":    "In Review",
  "inreview":     "In Review",
  "done":         "Done",
  "complete":     "Done",
  "completed":    "Done",
};

function normaliseStatus(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return VALID_STATUSES[raw.toLowerCase().trim()] ?? raw;
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
  if (!httpRes.ok) throw new Error(`Notion error ${httpRes.status}: ${JSON.stringify(json)}`);
  return json;
}

async function getTasksFromNotion() {
  const data = await notionRequest<{ results: Array<{ id: string; properties: Record<string, unknown> }> }>(`/databases/${NOTION_DB_ID}/query`, "POST", { page_size: 100 });
  return data.results.map((page: { id: string; properties: Record<string, unknown> }) => {
    const props = page.properties as {
      Name?: { title: Array<{ plain_text: string }> };
      "Due Date"?: { date: { start: string } | null };
      Priority?: { select: { name: string } | null };
      Status?: { status: { name: string } | null };
    };
    return {
      id:       page.id,
      title:    props?.Name?.title?.map((t) => t.plain_text).join("") ?? "",
      due_date: props?.["Due Date"]?.date?.start ?? null,
      priority: props?.Priority?.select?.name ?? null,
      status:   props?.Status?.status?.name ?? null,
    };
  });
}

interface TaskFields {
  title:           string | null;
  due_date:        string | null;
  priority:        string | null;
  status:          string | null;
  notes:           string | null;
  related_project: string | null;  // project name, resolved to page ID at creation time
}

// Known projects cache (name → page ID)
let projectsCache: Record<string, string> | null = null;

async function getProjects(): Promise<Record<string, string>> {
  if (projectsCache) return projectsCache;
  try {
    const data = await notionRequest<{ results: Array<{ id: string; properties: Record<string, unknown> }> }>(`/databases/${NOTION_PROJECTS_DB}/query`, "POST", { page_size: 50 });
    const map: Record<string, string> = {};
    for (const page of data.results) {
      const props = page.properties as { Name?: { title: Array<{ plain_text: string }> } };
      const name = props?.Name?.title?.map((t) => t.plain_text).join("").trim();
      if (name) map[name.toLowerCase()] = page.id;
    }
    projectsCache = map;
    return map;
  } catch {
    // If projects DB is unavailable, return known defaults (populated on first success)
    return {};
  }
}

async function resolveProjectId(name: string | null): Promise<string | null> {
  if (!name) return null;
  const projects = await getProjects();
  // exact match first, then partial
  const lower = name.toLowerCase().trim();
  if (projects[lower]) return projects[lower];
  const key = Object.keys(projects).find(k => k.includes(lower) || lower.includes(k));
  return key ? projects[key] : null;
}

async function createNotionTask(fields: TaskFields) {
  const status = normaliseStatus(fields.status) ?? "Not started";
  const properties: Record<string, unknown> = {
    Name:   { title: [{ text: { content: fields.title ?? "Untitled Task" } }] },
    Status: { status: { name: status } },
    Owner:  { people: [{ id: DHILLON_USER_ID }] },
  };
  if (fields.due_date) properties["Due Date"] = { date: { start: fields.due_date } };
  if (fields.priority) properties["Priority"] = { select: { name: fields.priority } };
  if (fields.notes)    properties["Notes"]    = { rich_text: [{ text: { content: fields.notes } }] };

  const projectId = await resolveProjectId(fields.related_project);
  if (projectId) properties["Related Project"] = { relation: [{ id: projectId }] };

  const page = await notionRequest<{ id: string }>("/pages", "POST", {
    parent: { database_id: NOTION_DB_ID },
    properties,
  });
  return page.id;
}

async function extractTaskFields(message: string): Promise<TaskFields> {
  const prompt = `Extract task details from this user message. Today is ${TODAY()}.

Message: "${message}"

Return ONLY valid JSON with exactly these fields (no markdown, no code fences):
{
  "title": "the task name, or null if not found",
  "due_date": "ISO date YYYY-MM-DD based on what the user says (e.g. '15th April 2026' → '2026-04-15'), or null",
  "priority": "Urgent, High, Medium, or Low exactly, or null if not mentioned",
  "status": "In progress, Not started, or In Review exactly (map user's words), or null if not mentioned",
  "notes": "any extra context, description, or notes about the task, or null",
  "related_project": "one of: Day-to-Day Life, Navaigate, Work, L&D — only if explicitly mentioned, otherwise null"
}

Examples:
- "in progress" or "status in progress" → "In progress"
- "high priority" or "urgent" → "High" or "Urgent"
- "due 15th April" or "due April 15" → "2026-04-15"
- "notes: call John first" → populate notes field
- "for work project" → "Work", "for L&D" → "L&D", "navaigate task" → "Navaigate"
Return only the JSON object, no other text.`;

  try {
    let raw = await geminiGenerate(prompt);
    raw = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(raw);
    return { ...parsed, related_project: parsed.related_project ?? null };
  } catch {
    return { title: null, due_date: null, priority: null, status: null, notes: null, related_project: null };
  }
}

router.post("/", async (req, res): Promise<void> => {
  const parsed = ProcessChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, response: "Invalid request." });
    return;
  }

  const { message } = parsed.data;
  const lowerMsg = message.toLowerCase();

  try {

    // ─── COMPLETE A PENDING TASK ──────────────────────────────────────────────
    if (message.startsWith("__PENDING_TASK__|")) {
      const parts       = message.split("|");
      const contextJson = parts[1] ?? "{}";
      const userReply   = parts.slice(2).join("|").replace(/^user_reply:/, "").trim();

      let existing: TaskFields = { title: null, due_date: null, priority: null, status: null, notes: null, related_project: null };
      try { existing = JSON.parse(contextJson); } catch { /* ignore */ }

      const supplement = await extractTaskFields(userReply);

      const merged: TaskFields = {
        title:           existing.title           ?? supplement.title,
        due_date:        existing.due_date        ?? supplement.due_date,
        priority:        existing.priority        ?? supplement.priority,
        status:          existing.status          ?? supplement.status,
        notes:           existing.notes           ?? supplement.notes,
        related_project: existing.related_project ?? supplement.related_project,
      };

      const isNoneAnswer = (v: string | null) =>
        !!v && ["none", "n/a", "skip", "no notes", "no priority", "no status", "no project", "—"].includes(v.toLowerCase().trim());

      const replyLower = userReply.toLowerCase();
      const rawNoneNotes   = /\bnotes?\s*:?\s*(none|n\/a|no|nothing|skip)\b/.test(replyLower);
      const rawNoneProject = /\b(no project|project\s*:?\s*(none|n\/a|no|nothing|skip)|none\s+project)\b/.test(replyLower);

      if (isNoneAnswer(supplement.notes)    || rawNoneNotes)    merged.notes           = "";
      if (isNoneAnswer(supplement.priority))                    merged.priority        = null;
      if (isNoneAnswer(supplement.status))                      merged.status          = null;
      if (isNoneAnswer(supplement.related_project) || rawNoneProject) merged.related_project = "";

      // All fields are optional — create the task with whatever was provided
      const taskId = await createNotionTask(merged);
      const details = [
        merged.due_date ? `due ${merged.due_date}` : null,
        merged.priority ? `${merged.priority} priority` : null,
        merged.status ? `status: ${normaliseStatus(merged.status)}` : "status: Not started",
      ].filter(Boolean).join(", ");
      res.json({
        success: true,
        response: `Task created: "${merged.title}"${details ? ` — ${details}` : ""}.`,
        action_taken: "task_created",
        data: { task_id: taskId, title: merged.title },
      });
      return;
    }

    // ─── CREATE TASK ─────────────────────────────────────────────────────────
    if (
      lowerMsg.includes("create task")   ||
      lowerMsg.includes("add task")      ||
      lowerMsg.includes("new task")      ||
      lowerMsg.includes("create a task")
    ) {
      const extracted = await extractTaskFields(message);

      if (!extracted.title) {
        res.json({
          success: true,
          response: "I'd like to create a task for you. Fill in the details below:",
          action_taken: "task_pending",
          data: { title: null, due_date: null, priority: null, status: null, notes: null, related_project: null, missing_fields: ["title", "due_date", "priority", "status", "notes", "related_project"] },
        });
        return;
      }

      // Always show all optional fields so the user can fill everything in one go
      const missingOptional: string[] = [];
      if (!extracted.due_date)        missingOptional.push("due_date");
      if (!extracted.priority)        missingOptional.push("priority");
      if (!extracted.status)          missingOptional.push("status");
      if (!extracted.notes)           missingOptional.push("notes");
      if (!extracted.related_project) missingOptional.push("related_project");

      if (missingOptional.length > 0) {
        res.json({
          success: true,
          response: `Got it — creating **"${extracted.title}"**. Fill in the details below (all optional — leave any blank to use defaults):`,
          action_taken: "task_pending",
          data: { ...extracted, missing_fields: missingOptional },
        });
        return;
      }

      const taskId = await createNotionTask(extracted);
      res.json({
        success: true,
        response: `Task created: "${extracted.title}" — due ${extracted.due_date}, ${extracted.priority} priority, status: ${normaliseStatus(extracted.status)}.`,
        action_taken: "task_created",
        data: { task_id: taskId, title: extracted.title },
      });
      return;
    }

    // ─── UPDATE / DELETE TASK ────────────────────────────────────────────────
    // Use Gemini to classify intent broadly — catches "delete X", "remove X",
    // "mark X done", "update X to high", etc. without requiring "task" keyword.
    const couldBeTaskCommand =
      !lowerMsg.startsWith("what") &&
      !lowerMsg.startsWith("how") &&
      !lowerMsg.startsWith("why") &&
      !lowerMsg.startsWith("when") &&
      !lowerMsg.startsWith("who") &&
      !lowerMsg.startsWith("is ") &&
      !lowerMsg.startsWith("are ") &&
      !lowerMsg.includes("briefing") &&
      !lowerMsg.includes("schedule") &&
      !lowerMsg.includes("news") &&
      (
        lowerMsg.includes("delete") || lowerMsg.includes("remove") || lowerMsg.includes("archive") ||
        lowerMsg.includes("trash")  || lowerMsg.includes("mark ")  || lowerMsg.includes("change ") ||
        lowerMsg.includes("update") || lowerMsg.includes(" set ")  || lowerMsg.includes("rename") ||
        lowerMsg.includes("complete") || lowerMsg.includes("finish") ||
        (lowerMsg.includes(" to ")   && (lowerMsg.includes("priority") || lowerMsg.includes("status") || lowerMsg.includes("done") || lowerMsg.includes("progress"))) ||
        (lowerMsg.includes("priority") && !lowerMsg.includes("show")) ||
        (lowerMsg.includes("status")   && !lowerMsg.includes("show"))
      ) &&
      !lowerMsg.includes("create") && !lowerMsg.includes("add task") && !lowerMsg.includes("new task");

    if (couldBeTaskCommand) {
      const parsePrompt = `You are a task management assistant. Parse this command and return the action to take. Today is ${TODAY()}.

Command: "${message}"

Return ONLY valid JSON (no markdown, no code fences):
{
  "action": "update_status" | "update_priority" | "update_due_date" | "update_title" | "update_notes" | "delete" | "not_task_command",
  "task_name": "the name/partial name of the task to modify — strip words like 'task', 'the task', 'my task' (keep only the actual task name)",
  "new_value": "the new value for status/priority/date/title, or null for delete or not_task_command"
}

Status values: Not started, In progress, In Review, Done
Priority values: Urgent, High, Medium, Low  
Date format: YYYY-MM-DD. Today is ${TODAY()}.

Examples:
- "delete test quick add"                    → action: delete,          task_name: "test quick add",           new_value: null
- "remove complete AI operating system mvp"  → action: delete,          task_name: "complete AI operating system mvp", new_value: null
- "mark reschedule microsoft as done"        → action: update_status,   task_name: "reschedule microsoft",     new_value: "Done"
- "change complete AI mvp to high priority"  → action: update_priority, task_name: "complete AI mvp",          new_value: "High"
- "set moving house to in progress"          → action: update_status,   task_name: "moving house",             new_value: "In progress"
- "update microsoft training due date to 20th April" → action: update_due_date, task_name: "microsoft training", new_value: "2026-04-20"
- "rename house task to buy house"           → action: update_title,    task_name: "house",                    new_value: "buy house"
- "the weather is nice today"                → action: not_task_command, task_name: null, new_value: null

If you are not confident this is a task management command, return action: "not_task_command".`;

      let parsed: { action: string; task_name: string | null; new_value: string | null } = { action: "not_task_command", task_name: null, new_value: null };
      try {
        let raw = await geminiGenerate(parsePrompt);
        raw = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
        const jsonStart = raw.indexOf("{");
        const jsonEnd   = raw.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) raw = raw.slice(jsonStart, jsonEnd + 1);
        parsed = JSON.parse(raw);
      } catch { /* fall through */ }

      if (parsed.action !== "not_task_command" && parsed.action !== "unknown" && parsed.task_name) {
        // Find task by fuzzy name match — multiple strategies
        const allTasks = await getTasksFromNotion();
        const queryLower = parsed.task_name.toLowerCase().trim();

        const matched = allTasks.find((t: { title: string }) => {
          const titleLower = t.title.toLowerCase();
          // 1. Exact match
          if (titleLower === queryLower) return true;
          // 2. Title contains the full query
          if (titleLower.includes(queryLower)) return true;
          // 3. Query contains the full title
          if (queryLower.includes(titleLower)) return true;
          // 4. All significant words in query appear in title
          const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
          const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
          if (queryWords.length > 0 && matchCount / queryWords.length >= 0.7) return true;
          return false;
        }) as { id: string; title: string } | undefined;

        if (!matched) {
          // List available tasks to help the user
          const taskNames = allTasks.slice(0, 8).map((t: { title: string }) => `• ${t.title}`).join("\n");
          res.json({
            success: true,
            response: `I couldn't find a task matching "${parsed.task_name}". Here are your current tasks:\n\n${taskNames}\n\nTry using the exact task name.`,
            action_taken: "task_not_found",
            data: null,
          });
          return;
        }

        if (parsed.action === "delete") {
          // Archive in Notion — this removes it from active views
          await notionRequest(`/pages/${matched.id}`, "PATCH", { archived: true });
          res.json({
            success: true,
            response: `Task "${matched.title}" has been archived and removed from your board.`,
            action_taken: "task_deleted",
            data: { task_id: matched.id, title: matched.title },
          });
          return;
        }

        const updateProps: Record<string, unknown> = {};
        let summary = "";

        if (parsed.action === "update_status" && parsed.new_value) {
          const norm = normaliseStatus(parsed.new_value) ?? parsed.new_value;
          updateProps["Status"] = { status: { name: norm } };
          summary = `status → "${norm}"`;
        } else if (parsed.action === "update_priority" && parsed.new_value) {
          updateProps["Priority"] = { select: { name: parsed.new_value } };
          summary = `priority → "${parsed.new_value}"`;
        } else if (parsed.action === "update_due_date" && parsed.new_value) {
          updateProps["Due Date"] = { date: { start: parsed.new_value } };
          summary = `due date → ${parsed.new_value}`;
        } else if (parsed.action === "update_title" && parsed.new_value) {
          updateProps["Name"] = { title: [{ text: { content: parsed.new_value } }] };
          summary = `renamed to "${parsed.new_value}"`;
        } else if (parsed.action === "update_notes" && parsed.new_value) {
          updateProps["Notes"] = { rich_text: [{ text: { content: parsed.new_value } }] };
          summary = `notes updated`;
        }

        if (Object.keys(updateProps).length > 0) {
          await notionRequest(`/pages/${matched.id}`, "PATCH", { properties: updateProps });
          res.json({
            success: true,
            response: `Done — "${matched.title}" updated: ${summary}.`,
            action_taken: "task_updated",
            data: { task_id: matched.id, title: matched.title },
          });
          return;
        }
      }
      // If Gemini said not_task_command, fall through to general AI
    }

    // ─── SHOW TASKS ──────────────────────────────────────────────────────────
    if (lowerMsg.includes("show") && (lowerMsg.includes("task") || lowerMsg.includes("overdue") || lowerMsg.includes("outstanding") || lowerMsg.includes("to-do") || lowerMsg.includes("todo"))) {
      const tasks   = await getTasksFromNotion();
      const today   = new Date(); today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

      let filtered = tasks;
      let label = "all";

      if (lowerMsg.includes("overdue")) {
        filtered = tasks.filter((t: { due_date: string | null }) => t.due_date && new Date(t.due_date) < today);
        label = "overdue";
      } else if (lowerMsg.includes("outstanding") || lowerMsg.includes("due soon")) {
        filtered = tasks.filter((t: { due_date: string | null }) => {
          if (!t.due_date) return false;
          const d = new Date(t.due_date);
          return d >= today && d <= nextWeek;
        });
        label = "outstanding";
      }

      const taskList = filtered.length > 0
        ? filtered.map((t: { title: string; due_date: string | null; priority: string | null; status: string | null }) =>
            `• ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.priority ? ` [${t.priority}]` : ""}${t.status ? ` — ${t.status}` : ""}`
          ).join("\n")
        : "No tasks found in this category.";

      res.json({
        success: true,
        response: `Here are your ${label} tasks:\n\n${taskList}`,
        action_taken: "tasks_shown",
        data: { tasks: filtered, category: label },
      });
      return;
    }

    // ─── CALENDAR ────────────────────────────────────────────────────────────
    if (lowerMsg.includes("schedule") || lowerMsg.includes("calendar") || lowerMsg.includes("tomorrow") || lowerMsg.includes("today")) {
      const isToday = !lowerMsg.includes("tomorrow");
      const calendarRes = await fetch(`http://localhost:${process.env.PORT}/api/calendar`).catch(() => null);
      if (calendarRes && calendarRes.ok) {
        const calData = await calendarRes.json() as {
          success: boolean;
          today:    { date: string; events: Array<{ time: string; title: string; duration?: string }> };
          tomorrow: { date: string; events: Array<{ time: string; title: string; duration?: string }> };
        };
        const day      = isToday ? calData.today : calData.tomorrow;
        const dayLabel = isToday ? "today" : "tomorrow";
        const eventList = day.events.length > 0
          ? day.events.map((e) => `• ${e.time}: ${e.title}${e.duration ? ` (${e.duration})` : ""}`).join("\n")
          : "No events scheduled.";
        res.json({
          success: true,
          response: `Your schedule for ${dayLabel} (${day.date}):\n\n${eventList}`,
          action_taken: "calendar_shown",
          data: day,
        });
        return;
      }
    }

    // ─── BRIEFING ────────────────────────────────────────────────────────────
    if (lowerMsg.includes("briefing") || lowerMsg.includes("news") || lowerMsg.includes("what's new") || lowerMsg.includes("what should i know")) {
      res.json({
        success: true,
        response: "Click the 'Generate Briefing' button on your dashboard to get the latest AI, tech, and business news tailored for you.",
        action_taken: "briefing_requested",
        data: null,
      });
      return;
    }

    // ─── PRIORITY ANALYSIS ───────────────────────────────────────────────────
    if (lowerMsg.includes("priority") || lowerMsg.includes("focus") || lowerMsg.includes("on track") || lowerMsg.includes("what should i")) {
      const tasks    = await getTasksFromNotion();
      const today    = new Date(); today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      const overdue     = tasks.filter((t: { due_date: string | null }) => t.due_date && new Date(t.due_date) < today);
      const outstanding = tasks.filter((t: { due_date: string | null }) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= today && d <= nextWeek;
      });

      const analysisPrompt = `You are a daily operating system assistant for Tarinder.
Overdue tasks (${overdue.length}): ${overdue.map((t: { title: string }) => t.title).join(", ") || "none"}
Due this week (${outstanding.length}): ${outstanding.map((t: { title: string }) => t.title).join(", ") || "none"}
Give a concise, actionable focus recommendation in 2-3 sentences. Be direct and professional.`;

      const aiText = await geminiGenerate(analysisPrompt);
      res.json({
        success: true,
        response: aiText || "Focus on your highest-priority tasks first.",
        action_taken: "priority_analysis",
        data: { overdue_count: overdue.length, outstanding_count: outstanding.length },
      });
      return;
    }

    // ─── GENERAL AI FALLBACK ─────────────────────────────────────────────────
    const systemContext = `You are Tarinder's daily operating system assistant. Help manage tasks (create, update, delete), check schedules, and explain priorities. Be concise, professional, and actionable. Keep responses under 150 words.

To create a task say: "create task [name] due [date] priority [level] status [status]"
To see tasks say: "show my tasks" or "show overdue tasks"
To check schedule say: "what's on today" or "show tomorrow"`;

    const aiText = await geminiGenerate(`${systemContext}\n\nUser: ${message}`);
    res.json({
      success: true,
      response: aiText || "I'm here to help. Try asking me to create a task, show your schedule, or generate your daily briefing.",
      action_taken: null,
      data: null,
    });

  } catch (err) {
    req.log.error({ err }, "Chat processing error");
    res.status(500).json({ success: false, response: "I encountered an error. Please try again." });
  }
});

export default router;
