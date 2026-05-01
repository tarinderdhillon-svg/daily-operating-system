import { Router } from "express";
import { GoogleGenerativeAI, type Tool } from "@google/generative-ai";

const router = Router();

// Chat uses cheap/fast lite model; briefing uses full Flash for grounding quality
const CHAT_MODEL    = "gemini-2.5-flash-lite";
const BRIEFING_MODEL = "gemini-2.5-flash";  // supports Google Search grounding

function getGemini(model = BRIEFING_MODEL) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model });
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
  "OpenAI or Anthropic or Google DeepMind major AI model release or announcement this week",
  "AI coding tools and developer productivity: GitHub Copilot, Cursor, Claude latest news",
  "NVIDIA GPU, AI chip, or semiconductor industry latest news",
  "AI agents and enterprise AI deployment: major company announcements",
  "LLM research breakthrough or open-source model release (Llama, Mistral, etc.)",
  "Big Tech AI strategy: Microsoft, Google, Meta, Apple AI product news",
];

const BUSINESS_TOPICS = [
  "Biggest trending global business story this week — widely reported by Reuters, Bloomberg, FT, or BBC",
  "Stock market movement or major index performance today — S&P 500, FTSE 100, Dow Jones or Nasdaq",
  "Major economy news: inflation data, interest rate decision, GDP report or jobs figures",
  "Big corporate story: CEO announcement, company restructure, major layoffs or hiring surge",
  "Consumer trend, retail, or spending behaviour story that is broadly trending this week",
  "Global trade, tariffs, supply chain or geopolitical event impacting business this week",
];

async function generateArticleWithGrounding(
  topic: string,
  category: "tech" | "business",
): Promise<BriefingArticle> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const fallbackSources: Record<string, string[]> = {
    tech:     ["TechCrunch", "The Verge", "Ars Technica", "MIT Technology Review", "Wired"],
    business: ["Financial Times", "Bloomberg", "Reuters", "Wall Street Journal", "The Economist"],
  };

  try {
    // Use Gemini with Google Search grounding for real, current articles
    const model = getGemini(BRIEFING_MODEL);
    const groundedModel = getGemini(BRIEFING_MODEL);

    // Build a grounded model with googleSearch tool
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const searchModel = genAI.getGenerativeModel({
      model: BRIEFING_MODEL,
      tools: [{ googleSearch: {} } as Tool],
    });

    const prompt = `Today is ${today}. Search for the most recent and significant news about: "${topic}"

Find the single most important story from the past 7 days that has been widely reported by major, trusted outlets. Write a professional executive briefing in this JSON format:

{
  "title": "Compelling specific headline under 85 characters — must reference real company/product/number",
  "summary": "Three-sentence executive summary: (1) What specifically happened with names and numbers, (2) Why it matters to the industry or market, (3) The key implication or action for a tech/business professional",
  "key_metrics": "Single most important data point: e.g. '$2.1B funding round', '47% revenue growth', 'Model scores 89% on MMLU' — or null if none",
  "source_name": "Name of the publication that reported this (e.g. Bloomberg, TechCrunch, Reuters)",
  "source_url": "Direct URL to the actual article you are citing — must be a real, working URL from search results"
}

STRICT SOURCE REQUIREMENTS:
- Only use stories reported by these trusted, high-quality outlets: Reuters, Bloomberg, Financial Times, The Economist, TechCrunch, The Verge, Ars Technica, MIT Technology Review, Wired, Wall Street Journal, BBC News, or official company press releases/blogs
- Do NOT use stories from opinion blogs, low-quality aggregators, or unverified sources
- Prioritise stories that are genuinely trending and widely reported — not niche or obscure items
- Use ONLY real information from search results — no fabricated facts
- The source_url must be the actual article URL from your search results, not a homepage
- Include specific company names, product names, dollar amounts, percentages where available
- Write at executive briefing quality — precise, no fluff

Return ONLY the JSON object, no markdown fences.`;

    const result = await searchModel.generateContent(prompt);
    const response = result.response;

    // Extract grounding metadata for real URLs
    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const firstGroundedChunk = groundingChunks[0];
    const groundedUrl   = firstGroundedChunk?.web?.uri ?? null;
    const groundedTitle = firstGroundedChunk?.web?.title ?? null;

    let raw = response.text().trim();
    // Strip markdown fences if present
    raw = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    // Strip any leading/trailing non-JSON characters
    const jsonStart = raw.indexOf("{");
    const jsonEnd   = raw.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      raw = raw.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(raw);

    // Prefer the grounded URL from search metadata (most reliable), then parsed URL
    const articleUrl = groundedUrl ?? parsed.source_url ?? null;
    const sourceName = groundedTitle
      ? new URL(groundedTitle.includes("http") ? groundedTitle : `https://${groundedTitle}`).hostname.replace("www.", "")
      : (parsed.source_name ?? fallbackSources[category][0]);

    // Validate the URL is actually a real article link
    const finalUrl = isValidArticleUrl(articleUrl)
      ? articleUrl
      : getRelevantFallbackUrl(topic, category);

    return {
      title:       parsed.title       ?? `Latest: ${topic}`,
      source:      parsed.source_name ?? sourceName,
      date:        today,
      summary:     parsed.summary     ?? "Summary unavailable.",
      key_metrics: parsed.key_metrics ?? null,
      link:        finalUrl,
    };
  } catch (err) {
    // Graceful degradation — return a useful stub with a relevant real URL
    return {
      title:       `Latest in: ${topic}`,
      source:      fallbackSources[category][0],
      date:        today,
      summary:     "Real-time data unavailable. Click the source link for the latest news.",
      key_metrics: null,
      link:        getRelevantFallbackUrl(topic, category),
    };
  }
}

function isValidArticleUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Reject homepage-only URLs (path is just "/" or empty)
    const hasPath = u.pathname.length > 1 && u.pathname !== "/";
    return hasPath && (u.protocol === "https:" || u.protocol === "http:");
  } catch {
    return false;
  }
}

function getRelevantFallbackUrl(topic: string, category: "tech" | "business"): string {
  const t = topic.toLowerCase();
  if (t.includes("openai") || t.includes("gpt"))      return "https://techcrunch.com/category/artificial-intelligence/";
  if (t.includes("google") || t.includes("gemini"))   return "https://techcrunch.com/category/artificial-intelligence/";
  if (t.includes("nvidia") || t.includes("gpu"))      return "https://www.reuters.com/technology/";
  if (t.includes("coding") || t.includes("developer")) return "https://techcrunch.com/category/artificial-intelligence/";
  if (t.includes("stock") || t.includes("market"))    return "https://www.reuters.com/markets/";
  if (t.includes("federal") || t.includes("rate"))    return "https://www.reuters.com/markets/";
  if (t.includes("semiconductor") || t.includes("chip")) return "https://www.reuters.com/technology/";
  if (category === "tech")     return "https://techcrunch.com/category/artificial-intelligence/";
  return "https://www.reuters.com/business/";
}

async function buildBriefing(): Promise<CachedBriefing> {
  // Generate all articles concurrently (6 + 6 = 12 parallel requests)
  const [aiArticles, businessArticles] = await Promise.all([
    Promise.all(AI_TECH_TOPICS.map((topic) => generateArticleWithGrounding(topic, "tech"))),
    Promise.all(BUSINESS_TOPICS.map((topic) => generateArticleWithGrounding(topic, "business"))),
  ]);

  return {
    generated_at:     new Date().toISOString(),
    ai_tech:          aiArticles,
    business_markets: businessArticles,
  };
}

function isBriefingStale(briefing: CachedBriefing): boolean {
  const now       = new Date();
  const generated = new Date(briefing.generated_at);
  if (generated.toDateString() !== now.toDateString()) return true;
  const cutoff = new Date(now);
  cutoff.setHours(5, 30, 0, 0);
  return now >= cutoff && generated < cutoff;
}

router.get("/", async (_req, res): Promise<void> => {
  res.json({ success: true, briefing: cachedBriefing ?? null });
});

// How long before we allow a forced re-generation (6 hours)
const REGEN_COOLDOWN_MS = 6 * 60 * 60 * 1000;

router.post("/", async (req, res): Promise<void> => {
  // If a fresh briefing exists (less than 6 hours old), return it immediately
  // without calling Gemini — saves ~12 API calls per click
  if (cachedBriefing) {
    const ageMs = Date.now() - new Date(cachedBriefing.generated_at).getTime();
    if (ageMs < REGEN_COOLDOWN_MS) {
      req.log.info({ ageMs }, "Briefing still fresh — returning cached version");
      res.json({ success: true, briefing: cachedBriefing });
      return;
    }
  }
  try {
    req.log.info("Generating daily briefing with Gemini + Google Search grounding…");
    cachedBriefing = await buildBriefing();
    req.log.info("Briefing generated with real search results");
    res.json({ success: true, briefing: cachedBriefing });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ success: false, briefing: null });
  }
});

export default router;
