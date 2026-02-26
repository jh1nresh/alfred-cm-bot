import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";
import { writeProjectConfig } from "../../../../config/loader.js";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";

export function validateRequirements(requirements: Record<string, any>): ValidationResult {
  if (!requirements.guildId) {
    return { valid: false, reason: "guildId is required (your Discord server ID)" };
  }
  if (!requirements.channelIds && !requirements.channelId) {
    return { valid: false, reason: "channelIds is required (Discord channel ID to monitor)" };
  }
  if (!requirements.projectName) {
    return { valid: false, reason: "projectName is required" };
  }
  return { valid: true };
}

export function requestPayment(requirements: Record<string, any>): string {
  const projectName = requirements.projectName || "your project";
  return `Setting up Alfred AI Community Manager for "${projectName}". 30 days of 24/7 Discord support. Please proceed with payment.`;
}

export async function executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> {
  const {
    guildId,
    channelIds,
    channelId,
    projectName,
    faqContent,
    systemPromptExtra,
  } = requirements;

  // Normalize channelIds
  const channels: string[] = channelIds
    ? (Array.isArray(channelIds) ? channelIds : String(channelIds).split(",").map((s: string) => s.trim()))
    : [String(channelId).trim()];

  // Calculate 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Write project config
  await writeProjectConfig(String(guildId), {
    guildId: String(guildId),
    projectName: String(projectName),
    payoutPerReply: 0.10,
    reactionThreshold: 3,
    watchChannelIds: channels,
    systemPromptExtra: systemPromptExtra || `You are the AI community manager for ${projectName}. Answer questions accurately and helpfully.`,
    knowledgeFiles: faqContent ? [`knowledge/${guildId}/faq.md`] : [],
    faqContent: faqContent || "",
    expiresAt,
    active: true,
  });

  // Write FAQ to knowledge file if provided
  if (faqContent) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, "../../../../..");
    const knowledgeDir = path.join(projectRoot, "knowledge", String(guildId));

    await fs.mkdir(knowledgeDir, { recursive: true });
    await fs.writeFile(path.join(knowledgeDir, "faq.md"), String(faqContent));
  }

  // Generate Discord invite link
  const permissions = "274878024704"; // Read Messages + Send Messages + Add Reactions + Read Message History
  const inviteLink = DISCORD_CLIENT_ID
    ? `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${permissions}&scope=bot`
    : "Please set DISCORD_CLIENT_ID env var to generate invite link";

  const result = {
    status: "active",
    projectName: String(projectName),
    guildId: String(guildId),
    watchingChannels: channels.length,
    inviteLink,
    expiresAt,
    message: `Alfred is now configured for ${projectName}! Add Alfred to your Discord using the invite link, then watch Alfred answer your community's questions 24/7.`,
    instructions: [
      `1. Click the invite link to add Alfred to your Discord server`,
      `2. Make sure Alfred has permission to read/send messages in channels: ${channels.join(", ")}`,
      `3. Alfred will automatically respond to questions and add checkmark reactions`,
      `4. Community members can click checkmark to mark helpful answers`,
    ],
  };

  return { deliverable: JSON.stringify(result) };
}
