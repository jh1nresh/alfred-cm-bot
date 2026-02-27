// =============================================================================
// Twitter content scheduler
// Runs in background, checks active projects and posts content on schedule.
// =============================================================================

import {
  listActiveTwitterProjects,
  updateProjectLastPosted,
  type TwitterProjectConfig,
} from "./project-store.js";
import { generateTweet } from "./content-generator.js";
import { buildTwitterClient, postTweet, postThread } from "./client.js";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

/**
 * Determine if a project is due for a new post.
 * Based on postsPerWeek setting.
 */
function isDueForPost(project: TwitterProjectConfig): boolean {
  if (!project.lastPostedAt) return true; // Never posted — go!

  const lastPosted = new Date(project.lastPostedAt);
  const now = new Date();

  // Calculate interval between posts based on weekly frequency
  // e.g. 4 posts/week = post every ~42 hours
  const intervalHours = (7 * 24) / project.postsPerWeek;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  return now.getTime() - lastPosted.getTime() >= intervalMs;
}

/**
 * Get Twitter credentials for a project.
 * Checks project-specific env vars first, falls back to global.
 */
function getCredentialsForProject(projectId: string) {
  const prefix = `TWITTER_${projectId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`;

  const appKey = process.env[`${prefix}API_KEY`] || process.env.TWITTER_API_KEY;
  const appSecret = process.env[`${prefix}API_SECRET`] || process.env.TWITTER_API_SECRET;
  const accessToken = process.env[`${prefix}ACCESS_TOKEN`] || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env[`${prefix}ACCESS_SECRET`] || process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return { appKey, appSecret, accessToken, accessSecret };
}

/**
 * Process a single active project — generate and post content if due.
 */
async function processProject(project: TwitterProjectConfig): Promise<void> {
  if (!isDueForPost(project)) {
    return;
  }

  console.log(`[twitter/scheduler] Processing project ${project.projectId} (${project.projectName})`);

  const creds = getCredentialsForProject(project.projectId);
  if (!creds) {
    console.warn(`[twitter/scheduler] No credentials for project ${project.projectId} — skipping`);
    return;
  }

  const client = buildTwitterClient(creds);

  // Rotate through content types based on post count
  const contentTypes = [
    "educational",
    "product_feature",
    "market_insight",
    "hot_take",
    "series_content",
    "competitor_insight",
  ];
  const cycle = project.totalPostsThisCycle ?? 0;
  const contentType = contentTypes[cycle % contentTypes.length];

  try {
    const content = await generateTweet(
      {
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        contentTopics: project.contentTopics,
        targetAudience: project.targetAudience,
        competitors: project.competitors,
        language: project.language,
        tone: project.tone,
        twitterHandle: project.twitterHandle,
      },
      contentType
    );

    if (content.type === "thread") {
      await postThread(client, content.tweets);
    } else {
      await postTweet(client, content.tweets[0]);
    }

    updateProjectLastPosted(project.projectId);
    console.log(
      `[twitter/scheduler] ✅ Posted ${content.type} (${contentType}) for ${project.projectName}`
    );
  } catch (err: any) {
    console.error(`[twitter/scheduler] ❌ Failed to post for ${project.projectId}:`, err.message);
  }
}

/**
 * Run one scheduling cycle — check all active projects.
 */
async function runSchedulerCycle(): Promise<void> {
  const projects = listActiveTwitterProjects();

  if (projects.length === 0) return;

  console.log(`[twitter/scheduler] Checking ${projects.length} active project(s)...`);

  for (const project of projects) {
    await processProject(project).catch((err) => {
      console.error(`[twitter/scheduler] Error in project ${project.projectId}:`, err);
    });
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the Twitter content scheduler.
 * Runs every hour to check if any projects need new content posted.
 */
export function startTwitterScheduler(): void {
  if (schedulerInterval) {
    console.warn("[twitter/scheduler] Already running");
    return;
  }

  console.log("[twitter/scheduler] Starting Twitter content scheduler...");

  // Run immediately on start
  runSchedulerCycle().catch(console.error);

  // Then run every CHECK_INTERVAL_MS
  schedulerInterval = setInterval(() => {
    runSchedulerCycle().catch(console.error);
  }, CHECK_INTERVAL_MS);

  console.log(`[twitter/scheduler] Running. Check interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
}

export function stopTwitterScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[twitter/scheduler] Stopped");
  }
}
