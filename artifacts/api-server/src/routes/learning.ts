import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import curriculumData from "../data/curriculum.json" assert { type: "json" };

const router = Router();

const NOTION_API_KEY = process.env.NOTION_API_KEY || "";
const NOTION_LEARNING_DB_ID = "33f6990a-2879-81ed-8265-c369ca896b83";
const NOTION_VERSION = "2022-06-28";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

const CATEGORY_WEIGHTS: Record<string, number> = {
  "Foundations": 0.40,
  "LLM-GenAI": 0.35,
  "Modern Trends": 0.15,
  "Enterprise": 0.10,
};

const SYSTEM_PROMPT = `You are an elite AI consulting mentor delivering daily lessons to a senior consultant. Your goal is to build consulting-level AI expertise through precise, business-focused teaching.

STRICT RULES:
- Always deliver exactly the 6-section structure below — no more, no less
- Write 600-800 words total across all sections
- Use second-person perspective ("You should...", "Your clients...")
- Write like a confident senior partner — direct, no hedging, no "might" or "could"
- Use recognizable companies and concrete metrics as examples
- Connect every concept to real client value, not academic theory
- No disclaimers, no meta-commentary, never say "as an AI"

6-SECTION STRUCTURE (use these exact headers):
## [Concept Name]
**Category:** [category] | **Difficulty:** [difficulty]

### 1. What It Is
[150-200 words: plain-English explanation of what it does, not how it works technically]

### 2. Why It Matters for Consulting
[80-120 words: direct connection to client value, revenue, or competitive advantage]

### 3. Real Business Example
[100-150 words: a specific company, what they did, the measurable outcome]

### 4. Connections & Context
[50-100 words: 2-3 related concepts and exactly how they connect to this one]

### 5. Reflection Question
[One clear question in plain language that tests understanding, not memorization. Answer in 1-2 sentences.]

### 6. Practical Takeaway
[One concrete action the reader can take today or this week]`;

interface NotionPage {
  id: string;
  properties: {
    Name?: { title: Array<{ plain_text: string }> };
    Category?: { select: { name: string } | null };
    Difficulty?: { select: { name: string } | null };
    Date?: { date: { start: string } | null };
    Status?: { select: { name: string } | null };
    Lesson?: { rich_text: Array<{ plain_text: string }> };
    "Is Recap"?: { checkbox: boolean };
  };
}

async function notionRequest<T = unknown>(path: string, method = "GET", body?: object): Promise<T> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T;
  if (!res.ok) throw new Error(`Notion ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function getLearningHistory(): Promise<NotionPage[]> {
  const data = await notionRequest<{ results: NotionPage[] }>(`/databases/${NOTION_LEARNING_DB_ID}/query`, "POST", {
    page_size: 100,
    sorts: [{ property: "Date", direction: "descending" }],
  });
  return data.results;
}

function selectNextConcept(history: NotionPage[]): typeof curriculumData.concepts[0] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSlugs = new Set<string>();
  const masteredSlugs = new Set<string>();

  for (const page of history) {
    const name = page.properties.Name?.title?.map(t => t.plain_text).join("") ?? "";
    const status = page.properties.Status?.select?.name ?? "";
    const dateStr = page.properties.Date?.date?.start;

    const concept = curriculumData.concepts.find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
    if (!concept) continue;

    if (status === "Mastered") masteredSlugs.add(concept.slug);

    if (dateStr) {
      const taughtDate = new Date(dateStr);
      if (taughtDate >= thirtyDaysAgo) recentSlugs.add(concept.slug);
    }
  }

  const available = curriculumData.concepts.filter(
    c => !masteredSlugs.has(c.slug) && !recentSlugs.has(c.slug)
  );

  const pool = available.length > 0 ? available : curriculumData.concepts.filter(
    c => !masteredSlugs.has(c.slug)
  );

  if (pool.length === 0) return curriculumData.concepts[0];

  const weightedPool: typeof curriculumData.concepts = [];
  for (const concept of pool) {
    const weight = CATEGORY_WEIGHTS[concept.category] ?? 0.1;
    const count = Math.max(1, Math.round(weight * 100));
    for (let i = 0; i < count; i++) weightedPool.push(concept);
  }

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

/**
 * Curated, highly-targeted YouTube search queries per concept slug.
 * Each query is designed to surface the canonical educational video as the first result.
 * Display title is shown as the link text.
 */
const YOUTUBE_CONCEPT_MAP: Record<string, { query: string; label: string }> = {
  "supervised-learning":        { query: "supervised learning explained statquest machine learning fundamentals", label: "Supervised Learning Explained — StatQuest" },
  "embeddings":                 { query: "word embeddings explained visual guide neural network", label: "Embeddings Explained — Visual Guide" },
  "transformer-architecture":   { query: "but what is a GPT visual intro transformer 3blue1brown", label: "What is a GPT? Visual Intro to Transformers — 3Blue1Brown" },
  "attention-mechanism":        { query: "attention in transformers visually explained 3blue1brown", label: "Attention in Transformers, Visually Explained — 3Blue1Brown" },
  "gradient-descent":           { query: "gradient descent how neural networks learn 3blue1brown", label: "Gradient Descent, How Neural Networks Learn — 3Blue1Brown" },
  "transfer-learning":          { query: "transfer learning explained deep learning tutorial beginner", label: "Transfer Learning Explained — DeepLearningAI" },
  "neural-network-fundamentals":{ query: "but what is a neural network 3blue1brown chapter 1", label: "But What Is a Neural Network? — 3Blue1Brown" },
  "overfitting-regularization": { query: "overfitting and regularization machine learning statquest explained", label: "Overfitting and Regularization Explained — StatQuest" },
  "cross-validation":           { query: "cross validation explained statquest machine learning", label: "Cross-Validation Explained — StatQuest" },
  "feature-engineering":        { query: "feature engineering machine learning tutorial data science explained", label: "Feature Engineering for Machine Learning — Tutorial" },
  "reinforcement-learning":     { query: "reinforcement learning explained simple introduction markov decision process", label: "Reinforcement Learning Explained — Visual Introduction" },
  "unsupervised-learning":      { query: "unsupervised learning explained clustering dimensionality reduction tutorial", label: "Unsupervised Learning Explained — Full Overview" },
  "tokenization":               { query: "tokenization large language models explained how LLMs tokenize text", label: "Tokenization in LLMs Explained — Andrej Karpathy" },
  "rag":                        { query: "retrieval augmented generation RAG explained IBM technology tutorial", label: "What is RAG? Retrieval-Augmented Generation — IBM Technology" },
  "function-calling":           { query: "function calling LLM explained openai tools tutorial", label: "LLM Function Calling Explained — Step-by-Step Tutorial" },
  "llm-evals":                  { query: "LLM evaluation metrics explained how to evaluate language models", label: "LLM Evaluation — How to Measure AI Performance" },
  "hallucinations-grounding":   { query: "AI hallucinations explained how to reduce grounding LLMs", label: "AI Hallucinations Explained — Causes and Fixes" },
  "structured-outputs":         { query: "structured outputs JSON mode LLM function calling explained", label: "Structured Outputs from LLMs Explained — Tutorial" },
  "prompt-engineering":         { query: "prompt engineering guide best practices techniques explained", label: "Prompt Engineering Full Guide — Best Practices" },
  "chain-of-thought":           { query: "chain of thought prompting explained reasoning LLM tutorial", label: "Chain-of-Thought Prompting Explained — Google Brain" },
  "rlhf-fine-tuning":           { query: "RLHF reinforcement learning human feedback fine tuning explained ChatGPT", label: "RLHF Explained — How ChatGPT is Trained" },
  "context-windows":            { query: "context window length LLM explained long context transformers tutorial", label: "Context Windows in LLMs Explained — Full Guide" },
  "system-prompts":             { query: "system prompt personas LLM explained guide best practices", label: "System Prompts and Personas Explained — LLM Guide" },
  "ai-agents":                  { query: "AI agents explained autonomous AI systems tutorial 2024", label: "AI Agents Explained — How Autonomous AI Works" },
  "multimodal-ai":              { query: "multimodal AI explained vision language models GPT-4V tutorial", label: "Multimodal AI Explained — Vision + Language Models" },
  "computer-use":               { query: "AI computer use browser automation agents explained Claude demo", label: "AI Computer Use Explained — Claude and Browser Agents" },
  "model-routing":              { query: "LLM model routing cascades explained cost efficiency AI systems", label: "Model Routing and Cascades in AI Systems Explained" },
  "mixture-of-experts":         { query: "mixture of experts MoE explained Mistral sparse gating tutorial", label: "Mixture of Experts (MoE) Explained — Sparse Gating" },
  "ai-governance":              { query: "AI governance risk management explained enterprise responsible AI", label: "AI Governance and Risk Explained — Enterprise Guide" },
  "measuring-ai-roi":           { query: "measuring AI ROI return on investment business value AI projects", label: "Measuring AI ROI — Business Value Framework" },
  "ai-adoption-barriers":       { query: "AI adoption barriers challenges enterprise implementation explained", label: "AI Adoption Barriers in Enterprise — Full Breakdown" },
  "human-in-the-loop":         { query: "human in the loop AI HITL explained machine learning design patterns", label: "Human-in-the-Loop AI Explained — Design Patterns" },
};

/**
 * Return a YouTube search URL for the concept.
 * Uses a curated, highly-targeted query if available, otherwise a generic search.
 * If the YouTube Data API is enabled on the GOOGLE_API_KEY project, upgrades to a direct video link.
 */
async function fetchYouTubeVideo(conceptSlug: string, conceptName: string): Promise<{ title: string; url: string }> {
  const curated = YOUTUBE_CONCEPT_MAP[conceptSlug];
  const searchQuery = curated?.query ?? `${conceptName} explained tutorial`;
  const displayLabel = curated?.label ?? `${conceptName} — Educational Overview`;

  // Try YouTube Data API v3 for a direct video link (requires YouTube API enabled on the Google Cloud project)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const params = new URLSearchParams({
        key:               apiKey,
        q:                 searchQuery,
        type:              "video",
        videoDuration:     "medium",
        videoEmbeddable:   "true",
        order:             "relevance",
        relevanceLanguage: "en",
        maxResults:        "5",
        part:              "snippet",
      });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      if (res.ok) {
        const data = await res.json() as {
          items?: Array<{ id: { videoId?: string }; snippet: { title: string; channelTitle: string } }>
        };
        const item = (data.items ?? []).find(i => i.id?.videoId);
        if (item?.id?.videoId) {
          return {
            title: `${item.snippet.title} — ${item.snippet.channelTitle}`,
            url:   `https://www.youtube.com/watch?v=${item.id.videoId}`,
          };
        }
      }
    } catch {
      // fall through
    }
  }

  // Fallback: highly-targeted YouTube search URL
  const q = encodeURIComponent(searchQuery).replace(/%20/g, "+");
  return {
    title: displayLabel,
    url:   `https://www.youtube.com/results?search_query=${q}`,
  };
}

async function generateLesson(concept: typeof curriculumData.concepts[0]): Promise<string> {
  const [completion, video] = await Promise.all([
    openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1400,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate today's lesson for: **${concept.name}**\nCategory: ${concept.category}\nDifficulty: ${concept.difficulty}`,
        },
      ],
    }),
    fetchYouTubeVideo(concept.slug, concept.name),
  ]);

  const lesson = completion.choices[0]?.message?.content ?? "";

  // Append Watch & Learn section with a real YouTube video link
  const watchSection = `\n\n### 7. Watch & Learn\n[${video.title}](${video.url})`;

  return lesson + watchSection;
}

function chunkText(text: string, maxLen = 1990): Array<{ text: { content: string } }> {
  const chunks: Array<{ text: { content: string } }> = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push({ text: { content: text.slice(i, i + maxLen) } });
  }
  return chunks.length > 0 ? chunks : [{ text: { content: "" } }];
}

async function saveToNotion(
  concept: typeof curriculumData.concepts[0],
  lesson: string,
  isRecap = false
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const data = await notionRequest<{ id: string }>("/pages", "POST", {
    parent: { database_id: NOTION_LEARNING_DB_ID },
    properties: {
      Name: { title: [{ text: { content: concept.name } }] },
      Category: { select: { name: concept.category } },
      Difficulty: { select: { name: concept.difficulty } },
      Date: { date: { start: today } },
      Status: { select: { name: "New" } },
      Lesson: { rich_text: chunkText(lesson) },
      "Is Recap": { checkbox: isRecap },
    },
  });
  return data.id;
}

async function getTodaysConcept(): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const data = await notionRequest<{ results: NotionPage[] }>(`/databases/${NOTION_LEARNING_DB_ID}/query`, "POST", {
    page_size: 10,
    filter: {
      property: "Date",
      date: { equals: today },
    },
  });
  const pages = data.results;
  const todayPage = pages.find(p => !p.properties["Is Recap"]?.checkbox);
  if (!todayPage) return null;
  return todayPage.properties.Lesson?.rich_text?.map(t => t.plain_text).join("") ?? null;
}

async function generateWeeklyRecap(history: NotionPage[]): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekConcepts = history.filter(p => {
    const dateStr = p.properties.Date?.date?.start;
    if (!dateStr) return false;
    return new Date(dateStr) >= sevenDaysAgo && !p.properties["Is Recap"]?.checkbox;
  });

  if (weekConcepts.length === 0) {
    return "## Weekly Recap\n\nNo concepts taught this week yet. Come back after your first daily lesson!";
  }

  const conceptList = weekConcepts.map(p => ({
    name: p.properties.Name?.title?.map(t => t.plain_text).join("") ?? "Unknown",
    category: p.properties.Category?.select?.name ?? "Unknown",
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1200,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate a weekly recap for these AI concepts studied this week:
${conceptList.map((c, i) => `${i + 1}. ${c.name} (${c.category})`).join("\n")}

Format as:
## Weekly Recap

### Concepts Covered This Week
[1-2 sentence summary of each concept]

### 3-Question Quiz
[3 questions testing understanding of this week's concepts, not memorization]

### Weakest Category This Week
[Identify the category with fewest concepts and suggest what to focus on]

### Consulting Takeaways
[Top 2 consulting-relevant insights from the week]

### Recommended Focus Next Week
[One concept or YouTube resource to strengthen understanding]`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

router.get("/concept", async (req, res): Promise<void> => {
  try {
    const existing = await getTodaysConcept();
    if (existing) {
      res.json({ lesson: existing, cached: true });
      return;
    }

    const history = await getLearningHistory();
    const concept = selectNextConcept(history);
    const lesson = await generateLesson(concept);
    await saveToNotion(concept, lesson, false);

    logger.info({ concept: concept.name }, "Daily lesson generated and saved to Notion");
    res.json({ lesson, cached: false, concept: concept.name, category: concept.category });
  } catch (err) {
    logger.error({ err }, "Failed to generate learning concept");
    res.status(500).json({ error: "Failed to generate lesson" });
  }
});

router.get("/recap", async (req, res): Promise<void> => {
  try {
    const history = await getLearningHistory();
    const recap = await generateWeeklyRecap(history);

    const today = new Date().toISOString().split("T")[0];
    await notionRequest("/pages", "POST", {
      parent: { database_id: NOTION_LEARNING_DB_ID },
      properties: {
        Name: { title: [{ text: { content: `Weekly Recap — ${today}` } }] },
        Category: { select: { name: "Foundations" } },
        Difficulty: { select: { name: "Beginner" } },
        Date: { date: { start: today } },
        Status: { select: { name: "New" } },
        Lesson: { rich_text: chunkText(recap) },
        "Is Recap": { checkbox: true },
      },
    }).catch(() => {});

    res.json({ recap });
  } catch (err) {
    logger.error({ err }, "Failed to generate weekly recap");
    res.status(500).json({ error: "Failed to generate recap" });
  }
});

router.post("/answer", async (req, res): Promise<void> => {
  try {
    const { answer } = req.body as { answer?: string };
    if (!answer?.trim()) {
      res.status(400).json({ error: "Answer is required" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const data = await notionRequest<{ results: NotionPage[] }>(`/databases/${NOTION_LEARNING_DB_ID}/query`, "POST", {
      page_size: 5,
      filter: { property: "Date", date: { equals: today } },
    });

    const pages = data.results;
    const todayPage = pages.find(p => !p.properties["Is Recap"]?.checkbox);

    if (!todayPage) {
      res.status(404).json({ error: "No lesson found for today" });
      return;
    }

    await notionRequest(`/pages/${todayPage.id}`, "PATCH", {
      properties: {
        "Quiz Answer": { rich_text: [{ text: { content: answer.slice(0, 2000) } }] },
        Status: { select: { name: "Reviewed" } },
      },
    });

    res.json({ saved: true });
  } catch (err) {
    logger.error({ err }, "Failed to save quiz answer");
    res.status(500).json({ error: "Failed to save answer" });
  }
});

export default router;
export { selectNextConcept, generateLesson, saveToNotion, getLearningHistory };
