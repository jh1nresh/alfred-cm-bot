import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { writeTwitterProjectConfig } from "../../../../twitter/project-store.js";
import { generateWeeklyContentPlan } from "../../../../twitter/content-generator.js";
import { buildTwitterClient, getMyProfile } from "../../../../twitter/client.js";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  if (!requirements.projectName) {
    return { valid: false, reason: "projectName is required" };
  }
  if (!requirements.projectDescription) {
    return { valid: false, reason: "projectDescription is required — detailed platform description helps generate better content" };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const projectName = requirements.projectName || "your project";
  const postsPerWeek = Math.max(7, Number(requirements.postsPerWeek) || 7);
  return `Setting up Alfred AI Twitter Pro for "${projectName}". ${postsPerWeek} posts/week + competitor monitoring + auto-reply. $15 USDC/day. Only 7.5% of a human CM's cost at equivalent output.`;
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  const {
    projectName,
    projectDescription,
    twitterHandle,
    contentTopics: contentTopicsRaw,
    targetAudience = "overseas Chinese-speaking crypto traders, 25-40 years old",
    competitors: competitorsRaw,
    language = "bilingual",
    postsPerWeek: postsRaw,
    contentSeries,
    twitterApiKey,
    twitterApiSecret,
    twitterAccessToken,
    twitterAccessSecret,
  } = requirements;

  const postsPerWeek = Math.max(7, Number(postsRaw) || 7);

  const contentTopics: string[] = contentTopicsRaw
    ? String(contentTopicsRaw).split(",").map((s: string) => s.trim()).filter(Boolean)
    : [
        "spot trading",
        "perpetual contracts",
        "stablecoins",
        "tokenized US stocks",
        "DeFi education",
        "market analysis",
        "trading platform comparison",
      ];

  const competitors: string[] = competitorsRaw
    ? String(competitorsRaw).split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["Binance", "OKX", "Bitget", "Backpack", "MSX"];

  const projectId = `twitter_pro_${Date.now()}_${String(projectName).toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const lang = (["zh", "en", "bilingual"].includes(String(language)) ? String(language) : "bilingual") as "zh" | "en" | "bilingual";

  await writeTwitterProjectConfig({
    projectId,
    projectName: String(projectName),
    projectDescription: String(projectDescription),
    twitterHandle: twitterHandle ? String(twitterHandle) : undefined,
    contentTopics,
    targetAudience: String(targetAudience),
    competitors,
    language: lang,
    tone: "professional",
    postsPerWeek,
    plan: "pro",
    expiresAt,
    active: true,
    createdAt: new Date().toISOString(),
    totalPostsThisCycle: 0,
  });

  // Connect Twitter if credentials provided
  let twitterConnected = false;
  let twitterUsername: string | null = null;

  if (twitterApiKey && twitterApiSecret && twitterAccessToken && twitterAccessSecret) {
    try {
      const client = buildTwitterClient({
        appKey: String(twitterApiKey),
        appSecret: String(twitterApiSecret),
        accessToken: String(twitterAccessToken),
        accessSecret: String(twitterAccessSecret),
      });
      const profile = await getMyProfile(client);
      if (profile) {
        twitterConnected = true;
        twitterUsername = `@${profile.username}`;

        const envPrefix = `TWITTER_${projectId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`;
        process.env[`${envPrefix}API_KEY`] = String(twitterApiKey);
        process.env[`${envPrefix}API_SECRET`] = String(twitterApiSecret);
        process.env[`${envPrefix}ACCESS_TOKEN`] = String(twitterAccessToken);
        process.env[`${envPrefix}ACCESS_SECRET`] = String(twitterAccessSecret);
      }
    } catch (err: any) {
      console.error(`[twitter_cm_pro] Twitter connection failed: ${err.message}`);
    }
  }

  // Generate content plan (7 posts)
  let contentPlan: Array<{ type: string; preview: string; topic: string; scheduledFor?: string }> = [];
  try {
    const plan = await generateWeeklyContentPlan(
      {
        projectName: String(projectName),
        projectDescription: String(projectDescription),
        contentTopics,
        targetAudience: String(targetAudience),
        competitors,
        language: lang,
        tone: "professional",
        twitterHandle: twitterHandle ? String(twitterHandle) : undefined,
      },
      postsPerWeek
    );

    contentPlan = plan.map((p) => ({
      type: p.type,
      topic: p.topic,
      preview: p.tweets[0].substring(0, 100) + (p.tweets[0].length > 100 ? "..." : ""),
      scheduledFor: p.scheduledFor?.toISOString(),
    }));
  } catch (err: any) {
    console.error(`[twitter_cm_pro] Content generation error: ${err.message}`);
  }

  // Build weekly schedule summary
  const weeklySchedule = {
    monday: "Series content / Educational thread",
    tuesday: "Product feature highlight",
    wednesday: "Market analysis & insights",
    thursday: "Hot take / Industry comment",
    friday: "User-focused content / Trading tips",
    saturday: "Competitor positioning piece",
    sunday: "Weekly recap / Engagement post",
  };

  const result = {
    status: twitterConnected ? "active" : "pending_credentials",
    projectName: String(projectName),
    projectId,
    twitterAccount: twitterUsername ?? "Not connected — provide credentials to activate",
    postsPerWeek,
    language: lang,
    expiresAt,
    contentPlan,
    weeklySchedule,
    features: [
      `${postsPerWeek}+ original tweets/week`,
      "Rotating content types: educational, product, market insights, hot takes, series",
      "Bilingual content (ZH + EN key terms)",
      `Competitor-aware positioning vs ${competitors.join(", ")}`,
      "Content series format for account building",
      "Auto-reply to mentions (when Twitter connected)",
      "30-day subscription",
    ],
    message: twitterConnected
      ? `✅ Alfred Pro is live for ${projectName}! ${postsPerWeek} posts/week + competitor monitoring active.`
      : `⚠️ Alfred Pro configured for ${projectName}. Add Twitter API credentials to activate auto-posting.`,
    roi: {
      alfredCost: "$450/month",
      humanCmCost: "$2,000/month",
      savings: "$1,550/month (77% cheaper)",
      output: `${postsPerWeek * 4}+ posts/month`,
    },
  };

  return { deliverable: JSON.stringify(result) };
}
