// =============================================================================
// Twitter content generator powered by Gemini AI
// Based on JD: crypto trading platform content (spot, contracts, stablecoins,
// tokenized US stocks), targeting overseas Chinese-speaking users.
// =============================================================================

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ContentConfig {
  projectName: string;
  projectDescription: string;
  contentTopics: string[];        // e.g. ["spot trading", "contracts", "stablecoins", "tokenized stocks"]
  targetAudience: string;         // e.g. "overseas Chinese-speaking crypto users"
  twitterHandle?: string;         // @handle for self-reference
  competitors?: string[];         // e.g. ["Binance", "OKX", "Bitget", "Backpack", "MSX"]
  language?: "zh" | "en" | "bilingual";  // content language
  tone?: "professional" | "casual" | "educational";
}

export interface GeneratedContent {
  type: "single" | "thread";
  tweets: string[];               // 1 item for single, multiple for thread
  topic: string;
  hashtags: string[];
  scheduledFor?: Date;
}

const CONTENT_TYPES = [
  "market_insight",       // 市場洞察/行情解讀
  "product_feature",      // 產品功能介紹
  "educational",          // 教育科普內容
  "hot_take",             // 話題熱點評論
  "series_content",       // 系列化主題內容
  "competitor_insight",   // 行業對比/競品分析視角
  "user_story",           // 用戶場景故事
];

/**
 * Generate a single tweet or thread for a given topic type.
 */
export async function generateTweet(
  config: ContentConfig,
  contentType: string = "educational"
): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const lang = config.language || "zh";
  const langInstruction = lang === "zh"
    ? "Write content in Traditional or Simplified Chinese (海外華人受眾). You can include occasional English crypto terms."
    : lang === "bilingual"
    ? "Write primarily in Chinese with key terms in English."
    : "Write in English.";

  const competitorContext = config.competitors?.length
    ? `Key competitors to be aware of (for positioning): ${config.competitors.join(", ")}.`
    : "";

  const prompt = `You are a professional crypto trading platform social media manager for ${config.projectName}.

${config.projectDescription}

${langInstruction}
${competitorContext}

Content focus areas: ${config.contentTopics.join(", ")}
Target audience: ${config.targetAudience}
Tone: ${config.tone || "professional yet approachable"}

Generate a ${contentType === "series_content" ? "tweet thread (3-5 tweets)" : "single tweet"} about: ${contentType.replace("_", " ")}

Requirements:
- Each tweet MUST be under 280 characters
- For threads: each tweet should flow naturally to the next
- Include relevant crypto hashtags (2-4 max)
- Be authentic, insightful, NOT generic corporate speak
- Reference real market dynamics or product features
- If a thread: format as: TWEET 1: [text] | TWEET 2: [text] | etc.
- End with relevant hashtags on the last tweet

Content type guidelines:
- market_insight: Share a specific insight about current crypto markets or trading trends
- product_feature: Highlight a specific platform feature that solves a real user pain point
- educational: Explain a complex crypto/trading concept simply (DeFi, perpetuals, etc.)
- hot_take: Comment on a trending Web3/crypto topic with a unique angle
- series_content: Start or continue a themed content series (e.g., "Web3入門系列")
- competitor_insight: Position the platform's advantages without directly attacking competitors
- user_story: Tell a relatable story about a crypto trader's journey or challenge

Generate ONE piece of content now:`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Parse thread vs single tweet
  const isThread = text.includes("TWEET 1:") || text.includes("TWEET1:");
  let tweets: string[] = [];

  if (isThread) {
    // Split by TWEET N: pattern
    const parts = text.split(/TWEET\s*\d+:\s*/i).filter(Boolean);
    tweets = parts.map((t) => t.trim()).filter((t) => t.length > 0);
  } else {
    tweets = [text];
  }

  // Ensure each tweet is within 280 chars
  tweets = tweets.map((t) => t.length > 280 ? t.substring(0, 277) + "..." : t);

  // Extract hashtags
  const hashtagRegex = /#[\w\u4e00-\u9fff]+/g;
  const allHashtags = tweets.join(" ").match(hashtagRegex) ?? [];
  const uniqueHashtags = [...new Set(allHashtags)];

  return {
    type: isThread ? "thread" : "single",
    tweets,
    topic: contentType,
    hashtags: uniqueHashtags,
  };
}

/**
 * Generate a weekly content plan (4+ posts/week as per JD).
 */
export async function generateWeeklyContentPlan(
  config: ContentConfig,
  postsPerWeek = 4
): Promise<GeneratedContent[]> {
  const plan: GeneratedContent[] = [];

  // Rotate through content types to ensure variety
  const rotation = [
    "educational",
    "product_feature",
    "market_insight",
    "hot_take",
    "series_content",
    "competitor_insight",
    "user_story",
  ];

  for (let i = 0; i < postsPerWeek; i++) {
    const contentType = rotation[i % rotation.length];
    try {
      const content = await generateTweet(config, contentType);
      // Spread posts across the week (Mon/Tue/Thu/Fri for max engagement)
      const postDays = [1, 2, 4, 5, 0, 3, 6]; // Mon=1, Tue=2, Thu=4, Fri=5...
      const now = new Date();
      const dayOffset = postDays[i % postDays.length];
      const scheduledFor = new Date(now);
      scheduledFor.setDate(now.getDate() + dayOffset);
      scheduledFor.setHours(10 + (i * 3) % 8, 0, 0, 0); // Stagger posting times

      content.scheduledFor = scheduledFor;
      plan.push(content);
    } catch (err) {
      console.error(`[twitter/generator] Failed to generate content type ${contentType}:`, err);
    }
  }

  return plan;
}

/**
 * Generate a reply to a mention or relevant tweet.
 */
export async function generateTweetReply(
  config: ContentConfig,
  originalTweet: string,
  context = ""
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const lang = config.language || "zh";
  const langInstruction = lang === "zh" ? "Reply in Chinese (can include English terms)." : "Reply in English.";

  const prompt = `You are the social media manager for ${config.projectName}, a crypto trading platform.

${langInstruction}

Someone tweeted: "${originalTweet}"
${context ? `Context: ${context}` : ""}

Write a helpful, engaging reply that:
- Is under 280 characters
- Represents ${config.projectName} professionally
- Adds value or engages authentically
- Does NOT sound like a bot or generic corporate response
- If it's a question about crypto/trading, give a concise helpful answer

Reply only the tweet text, nothing else:`;

  const result = await model.generateContent(prompt);
  const reply = result.response.text().trim();
  return reply.length > 280 ? reply.substring(0, 277) + "..." : reply;
}
