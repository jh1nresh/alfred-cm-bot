import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { writeTwitterProjectConfig } from "../../../../twitter/project-store.js";
import { generateWeeklyContentPlan } from "../../../../twitter/content-generator.js";
import { buildTwitterClient, getMyProfile } from "../../../../twitter/client.js";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  if (!requirements.projectName) {
    return { valid: false, reason: "projectName is required" };
  }
  if (!requirements.projectDescription) {
    return { valid: false, reason: "projectDescription is required — describe your platform and key products" };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const projectName = requirements.projectName || "your project";
  const postsPerWeek = Math.max(4, Number(requirements.postsPerWeek) || 4);
  return `Setting up Alfred AI Twitter Content Manager for "${projectName}". ${postsPerWeek} original posts/week targeting crypto traders. Please proceed with payment ($5 USDC/day).`;
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  const {
    projectName,
    projectDescription,
    twitterHandle,
    contentTopics: contentTopicsRaw,
    targetAudience = "crypto traders and DeFi enthusiasts",
    competitors: competitorsRaw,
    language = "zh",
    postsPerWeek: postsRaw,
    twitterApiKey,
    twitterApiSecret,
    twitterAccessToken,
    twitterAccessSecret,
  } = requirements;

  const postsPerWeek = Math.max(4, Number(postsRaw) || 4);

  // Parse comma-separated fields
  const contentTopics: string[] = contentTopicsRaw
    ? String(contentTopicsRaw).split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["spot trading", "perpetual contracts", "stablecoins", "DeFi education", "market insights"];

  const competitors: string[] = competitorsRaw
    ? String(competitorsRaw).split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["Binance", "OKX", "Bitget", "Backpack", "MSX"];

  // Generate a unique project ID
  const projectId = `twitter_${Date.now()}_${String(projectName).toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20)}`;

  // Calculate 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Save project config
  await writeTwitterProjectConfig({
    projectId,
    projectName: String(projectName),
    projectDescription: String(projectDescription),
    twitterHandle: twitterHandle ? String(twitterHandle) : undefined,
    contentTopics,
    targetAudience: String(targetAudience),
    competitors,
    language: (["zh", "en", "bilingual"].includes(String(language)) ? String(language) : "zh") as "zh" | "en" | "bilingual",
    tone: "professional",
    postsPerWeek,
    plan: "starter",
    expiresAt,
    active: true,
    createdAt: new Date().toISOString(),
    totalPostsThisCycle: 0,
  });

  // If Twitter API credentials are provided, store them as env vars in runtime
  // (In production, these would be stored in a secrets vault)
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

        // Store credentials in process.env for scheduler (ephemeral — use secrets manager in prod)
        const envPrefix = `TWITTER_${projectId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`;
        process.env[`${envPrefix}API_KEY`] = String(twitterApiKey);
        process.env[`${envPrefix}API_SECRET`] = String(twitterApiSecret);
        process.env[`${envPrefix}ACCESS_TOKEN`] = String(twitterAccessToken);
        process.env[`${envPrefix}ACCESS_SECRET`] = String(twitterAccessSecret);

        console.log(`[twitter_cm_starter] Connected to Twitter: ${twitterUsername}`);
      }
    } catch (err: any) {
      console.error(`[twitter_cm_starter] Twitter connection failed: ${err.message}`);
    }
  }

  // Generate first week's content plan (sample)
  let contentPlan: Array<{ type: string; preview: string; topic: string; scheduledFor?: string }> = [];
  try {
    const plan = await generateWeeklyContentPlan(
      {
        projectName: String(projectName),
        projectDescription: String(projectDescription),
        contentTopics,
        targetAudience: String(targetAudience),
        competitors,
        language: (["zh", "en", "bilingual"].includes(String(language)) ? String(language) : "zh") as "zh" | "en" | "bilingual",
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
    console.error(`[twitter_cm_starter] Content generation error: ${err.message}`);
  }

  const result = {
    status: twitterConnected ? "active" : "pending_credentials",
    projectName: String(projectName),
    projectId,
    twitterAccount: twitterUsername ?? "Not connected",
    contentTopics,
    postsPerWeek,
    language,
    expiresAt,
    contentPlan,
    message: twitterConnected
      ? `✅ Alfred is now managing Twitter/X for ${projectName}! ${postsPerWeek} posts/week scheduled. First content plan is ready.`
      : `⚠️ Alfred is configured for ${projectName} but Twitter credentials were not provided. Please add TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET to Alfred's environment. Alfred will begin posting once credentials are set.`,
    instructions: twitterConnected
      ? [
          `Alfred will automatically post ${postsPerWeek} tweets per week`,
          `Content covers: ${contentTopics.join(", ")}`,
          `Language: ${language}`,
          `Targeting: ${targetAudience}`,
          `Project ID for updates: ${projectId}`,
        ]
      : [
          `To activate auto-posting, provide Twitter API credentials`,
          `Get credentials at: https://developer.twitter.com/en/portal/dashboard`,
          `Required: API Key, API Secret, Access Token, Access Secret`,
          `Project ID: ${projectId}`,
        ],
  };

  return { deliverable: JSON.stringify(result) };
}
