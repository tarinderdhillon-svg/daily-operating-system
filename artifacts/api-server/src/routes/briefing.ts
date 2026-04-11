import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../lib/logger";

const router = Router();

const GEMINI_MODEL = "gemini-2.5-flash-lite";  // cheapest capable Gemini model

function getGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
}

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
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  topic: string,
  category: string,
): Promise<BriefingArticle> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const sources: Record<string, string[]> = {
    tech:     ["TechCrunch", "The Verge", "Wired", "MIT Technology Review", "ArXiv", "Ars Technica"],
    business: ["Financial Times", "Bloomberg", "The Economist", "McKinsey Insights", "Wall Street Journal", "Reuters"],
  };
  const sourceList = category === "tech" ? sources.tech : sources.business;
  const source = sourceList[Math.floor(Math.random() * sourceList.length)];

  const prompt = `Generate a realistic, professional news briefing article about: "${topic}"

Today's date: ${today}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "compelling headline (under 80 chars)",
  "summary": "2-3 sentences covering the key development, business impact, and implications for professionals",
  "key_metrics": "one key data point or metric if relevant, or null",
  "link": "https://example.com/article"
}

Make the content feel current, specific, and professionally written. Include realistic-sounding data points where relevant.`;

  try {
    const result  = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    // strip markdown code fences if present
    raw = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(raw);
    return {
      title:       parsed.title       ?? `Latest developments in ${topic}`,
      source,
      date:        today,
      summary:     parsed.summary     ?? "Summary unavailable.",
      key_metrics: parsed.key_metrics ?? null,
      link:        parsed.link        ?? "https://techcrunch.com",
    };
  } catch {
    return {
      title:       `Latest developments in ${topic}`,
      source,
      date:        today,
      summary:     "Unable to generate summary at this time.",
      key_metrics: null,
      link:        "https://techcrunch.com",
    };
  }
}

async function buildBriefing(): Promise<CachedBriefing> {
  const model = getGemini();

  const [aiArticles, businessArticles] = await Promise.all([
    Promise.all(AI_TECH_TOPICS.map((topic) => generateArticle(model, topic, "tech"))),
    Promise.all(BUSINESS_TOPICS.map((topic) => generateArticle(model, topic, "business"))),
  ]);

  return {
    generated_at:     new Date().toISOString(),
    ai_tech:          aiArticles,
    business_markets: businessArticles,
  };
}

function isBriefingStale(briefing: CachedBriefing): boolean {
  const now = new Date();
  const generated = new Date(briefing.generated_at);

  // Different calendar day → always stale
  if (generated.toDateString() !== now.toDateString()) return true;

  // Same day: stale if current time is past 05:30 but briefing was generated before 05:30
  const cutoff = new Date(now);
  cutoff.setHours(5, 30, 0, 0);
  return now >= cutoff && generated < cutoff;
}

router.get("/", async (req, res): Promise<void> => {
  if (cachedBriefing) {
    // Auto-refresh in background if stale (past 05:30 and not yet refreshed today)
    if (isBriefingStale(cachedBriefing)) {
      req.log.info("Briefing is stale — triggering background refresh for 05:30 schedule");
      buildBriefing()
        .then(b => { cachedBriefing = b; })
        .catch(err => req.log.error({ err }, "Background briefing refresh failed"));
    }
    res.json({ success: true, briefing: cachedBriefing });
    return;
  }
  res.json({ success: true, briefing: null });
});

router.post("/", async (req, res): Promise<void> => {
  try {
    req.log.info("Generating daily briefing with Gemini...");
    cachedBriefing = await buildBriefing();
    req.log.info("Briefing generated successfully");
    res.json({ success: true, briefing: cachedBriefing });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ success: false, briefing: null });
  }
});

export default router;
