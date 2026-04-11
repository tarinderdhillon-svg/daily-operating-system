import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

interface CachedBriefing {
  generated_at: string;
  ai_tech: BriefingArticle[];
  business_markets: BriefingArticle[];
}

interface BriefingArticle {
  title: string;
  source: string;
  date: string;
  summary: string;
  key_metrics: string | null;
  link: string;
}

let cachedBriefing: CachedBriefing | null = null;

const AI_TECH_TOPICS = [
  "OpenAI GPT-5 and latest large language model developments",
  "Google DeepMind Gemini model updates and AI research breakthroughs",
  "AI agents and autonomous systems in enterprise software",
  "Generative AI coding tools and developer productivity (Cursor, GitHub Copilot)",
  "AI infrastructure and GPU computing market (NVIDIA, AMD)",
  "Machine learning research: multimodal models, reinforcement learning advances",
];

const BUSINESS_TOPICS = [
  "Global stock market performance and interest rate outlook",
  "Tech sector earnings and valuation trends",
  "AI startup funding rounds and venture capital activity",
  "Semiconductor supply chain and chip manufacturing geopolitics",
  "Enterprise software M&A and strategic partnerships",
  "Macroeconomic trends: inflation, employment, central bank policy",
];

async function generateArticle(
  client: OpenAI,
  topic: string,
  category: string,
): Promise<BriefingArticle> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sources: Record<string, string[]> = {
    tech: ["TechCrunch", "The Verge", "Wired", "MIT Technology Review", "ArXiv", "Ars Technica"],
    business: ["Financial Times", "Bloomberg", "The Economist", "McKinsey Insights", "Wall Street Journal", "Reuters"],
  };

  const sourceList = category === "tech" ? sources.tech : sources.business;
  const source = sourceList[Math.floor(Math.random() * sourceList.length)];

  const prompt = `Generate a realistic, professional news briefing article about: "${topic}"

Today's date: ${today}

Return ONLY valid JSON with this exact structure:
{
  "title": "compelling headline (under 80 chars)",
  "summary": "2-3 sentences covering the key development, business impact, and implications for professionals",
  "key_metrics": "one key data point or metric if relevant, or null",
  "link": "https://example.com/article"
}

Make the content feel current, specific, and professionally written. Include realistic-sounding data points where relevant.`;

  const response = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  return {
    title: parsed.title ?? `Latest developments in ${topic}`,
    source,
    date: today,
    summary: parsed.summary ?? "Summary unavailable.",
    key_metrics: parsed.key_metrics ?? null,
    link: parsed.link ?? "https://techcrunch.com",
  };
}

async function buildBriefing(): Promise<CachedBriefing> {
  const client = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });

  const [aiArticles, businessArticles] = await Promise.all([
    Promise.all(
      AI_TECH_TOPICS.map((topic) => generateArticle(client, topic, "tech")),
    ),
    Promise.all(
      BUSINESS_TOPICS.map((topic) => generateArticle(client, topic, "business")),
    ),
  ]);

  return {
    generated_at: new Date().toISOString(),
    ai_tech: aiArticles,
    business_markets: businessArticles,
  };
}

router.get("/", async (req, res): Promise<void> => {
  if (cachedBriefing) {
    res.json({ success: true, briefing: cachedBriefing });
    return;
  }

  res.json({ success: true, briefing: null });
});

router.post("/", async (req, res): Promise<void> => {
  try {
    req.log.info("Generating daily briefing...");
    cachedBriefing = await buildBriefing();
    req.log.info("Briefing generated successfully");
    res.json({ success: true, briefing: cachedBriefing });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ success: false, briefing: null });
  }
});

export default router;
