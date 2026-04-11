import { Router } from "express";
import OpenAI from "openai";
import { ProcessChatBody } from "@workspace/api-zod";

const router = Router();

const NOTION_API_KEY = "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";
const NOTION_DB_ID = "3356990a287981128f2ffe49ada5e44f";
const NOTION_VERSION = "2022-06-28";

async function notionRequest(path: string, method: string = "GET", body?: object) {
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
  if (!res.ok) throw new Error(`Notion error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function getTasksFromNotion() {
  const data = await notionRequest(`/databases/${NOTION_DB_ID}/query`, "POST", { page_size: 100 });
  return data.results.map((page: { id: string; properties: Record<string, unknown> }) => {
    const props = page.properties as {
      Name?: { title: Array<{ plain_text: string }> };
      "Due Date"?: { date: { start: string } | null };
      Priority?: { select: { name: string } | null };
      Status?: { status: { name: string } | null };
    };
    return {
      id: page.id,
      title: props?.Name?.title?.map((t: { plain_text: string }) => t.plain_text).join("") ?? "",
      due_date: props?.["Due Date"]?.date?.start ?? null,
      priority: props?.Priority?.select?.name ?? null,
      status: props?.Status?.status?.name ?? null,
    };
  });
}

async function createTask(title: string, due_date: string | null, priority: string | null) {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    Status: { status: { name: "Not started" } },
  };
  if (due_date) properties["Due Date"] = { date: { start: due_date } };
  if (priority) properties["Priority"] = { select: { name: priority } };

  const page = await notionRequest("/pages", "POST", {
    parent: { database_id: NOTION_DB_ID },
    properties,
  });
  return page.id;
}

router.post("/", async (req, res): Promise<void> => {
  const parsed = ProcessChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, response: "Invalid request." });
    return;
  }

  const { message } = parsed.data;
  const lowerMsg = message.toLowerCase();

  const client = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });

  try {
    if (lowerMsg.includes("create task") || lowerMsg.includes("add task") || lowerMsg.includes("new task")) {
      const extractPrompt = `Extract task details from this message: "${message}"

Return ONLY valid JSON:
{
  "title": "task title",
  "due_date": "YYYY-MM-DD or null",
  "priority": "High, Medium, Low, or null"
}`;
      const extractRes = await client.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: extractPrompt }],
        response_format: { type: "json_object" },
      });
      const extracted = JSON.parse(extractRes.choices[0]?.message?.content ?? "{}");
      const title = extracted.title ?? message.replace(/create task:?/i, "").trim();
      const taskId = await createTask(title, extracted.due_date ?? null, extracted.priority ?? null);

      res.json({
        success: true,
        response: `Task created: "${title}"${extracted.due_date ? ` due ${extracted.due_date}` : ""}${extracted.priority ? ` [${extracted.priority}]` : ""}. It has been added to your Notion workspace.`,
        action_taken: "task_created",
        data: { task_id: taskId, title },
      });
      return;
    }

    if (lowerMsg.includes("show") && (lowerMsg.includes("task") || lowerMsg.includes("overdue") || lowerMsg.includes("outstanding") || lowerMsg.includes("to-do") || lowerMsg.includes("todo"))) {
      const tasks = await getTasksFromNotion();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

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
        ? filtered.map((t: { title: string; due_date: string | null; priority: string | null }) => `• ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.priority ? ` [${t.priority}]` : ""}`).join("\n")
        : "No tasks found in this category.";

      res.json({
        success: true,
        response: `Here are your ${label} tasks:\n\n${taskList}`,
        action_taken: "tasks_shown",
        data: { tasks: filtered, category: label },
      });
      return;
    }

    if (lowerMsg.includes("schedule") || lowerMsg.includes("calendar") || lowerMsg.includes("tomorrow") || lowerMsg.includes("today")) {
      const isToday = lowerMsg.includes("today") || (!lowerMsg.includes("tomorrow"));
      const calendarRes = await fetch(`http://localhost:${process.env.PORT}/api/calendar`).catch(() => null);

      if (calendarRes && calendarRes.ok) {
        const calData = await calendarRes.json() as { success: boolean; today: { date: string; events: Array<{ time: string; title: string; duration?: string }> }; tomorrow: { date: string; events: Array<{ time: string; title: string; duration?: string }> } };
        const day = isToday ? calData.today : calData.tomorrow;
        const dayLabel = isToday ? "today" : "tomorrow";
        const eventList = day.events.length > 0
          ? day.events.map((e: { time: string; title: string; duration?: string }) => `• ${e.time}: ${e.title}${e.duration ? ` (${e.duration})` : ""}`).join("\n")
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

    if (lowerMsg.includes("briefing") || lowerMsg.includes("news") || lowerMsg.includes("what's new") || lowerMsg.includes("what should i know")) {
      res.json({
        success: true,
        response: "Generating your daily briefing now. This will fetch the latest AI, tech, and business news for you. Click the 'Generate Briefing' button or wait for it to appear in the dashboard.",
        action_taken: "briefing_requested",
        data: null,
      });
      return;
    }

    if (lowerMsg.includes("priority") || lowerMsg.includes("focus") || lowerMsg.includes("on track") || lowerMsg.includes("what should i")) {
      const tasks = await getTasksFromNotion();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const overdue = tasks.filter((t: { due_date: string | null }) => t.due_date && new Date(t.due_date) < today);
      const outstanding = tasks.filter((t: { due_date: string | null }) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= today && d <= nextWeek;
      });

      const focusPrompt = `You are a daily operating system assistant. Here's the user's task situation:
Overdue tasks (${overdue.length}): ${overdue.map((t: { title: string }) => t.title).join(", ") || "none"}
Due this week (${outstanding.length}): ${outstanding.map((t: { title: string; due_date?: string | null }) => t.title).join(", ") || "none"}

Give a concise, actionable focus recommendation in 2-3 sentences. Be direct and professional.`;

      const aiResponse = await client.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: focusPrompt }],
      });

      res.json({
        success: true,
        response: aiResponse.choices[0]?.message?.content ?? "Focus on your highest-priority tasks first.",
        action_taken: "priority_analysis",
        data: { overdue_count: overdue.length, outstanding_count: outstanding.length },
      });
      return;
    }

    const aiResponse = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You are a helpful daily operating system assistant. Help the user manage tasks, check their schedule, and understand their priorities. Be concise, professional, and actionable. Keep responses under 150 words.",
        },
        { role: "user", content: message },
      ],
    });

    res.json({
      success: true,
      response: aiResponse.choices[0]?.message?.content ?? "I'm here to help. Try asking me to create a task, show your schedule, or generate your daily briefing.",
      action_taken: null,
      data: null,
    });
  } catch (err) {
    req.log.error({ err }, "Chat processing error");
    res.status(500).json({
      success: false,
      response: "I encountered an error. Please try again.",
    });
  }
});

export default router;
