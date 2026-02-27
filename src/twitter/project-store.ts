// =============================================================================
// Twitter project configuration store
// Persists Twitter CM project configs to disk (similar to Discord's config/loader.ts)
// =============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "../../data/twitter-projects.json");

export interface TwitterProjectConfig {
  projectId: string;              // unique id (e.g. ACP job-based)
  projectName: string;
  projectDescription: string;
  twitterHandle?: string;         // @handle of the managed account
  contentTopics: string[];
  targetAudience: string;
  competitors: string[];
  language: "zh" | "en" | "bilingual";
  tone: "professional" | "casual" | "educational";
  postsPerWeek: number;
  plan: "starter" | "pro";
  // Credentials stored separately via env vars keyed by projectId
  // TWITTER_API_KEY_<projectId>, TWITTER_API_SECRET_<projectId>, etc.
  // OR global: TWITTER_API_KEY, TWITTER_API_SECRET, etc.
  expiresAt: string;
  active: boolean;
  createdAt: string;
  lastPostedAt?: string;
  totalPostsThisCycle?: number;
}

type ProjectStore = Record<string, TwitterProjectConfig>;

function loadStore(): ProjectStore {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as ProjectStore;
  } catch {
    return {};
  }
}

function saveStore(store: ProjectStore): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function writeTwitterProjectConfig(config: TwitterProjectConfig): void {
  const store = loadStore();
  store[config.projectId] = config;
  saveStore(store);
  console.log(`[twitter/store] Saved project config: ${config.projectId}`);
}

export function getTwitterProjectConfig(projectId: string): TwitterProjectConfig | null {
  const store = loadStore();
  return store[projectId] ?? null;
}

export function listActiveTwitterProjects(): TwitterProjectConfig[] {
  const store = loadStore();
  return Object.values(store).filter(
    (p) => p.active && new Date(p.expiresAt) > new Date()
  );
}

export function updateProjectLastPosted(projectId: string): void {
  const store = loadStore();
  if (store[projectId]) {
    store[projectId].lastPostedAt = new Date().toISOString();
    store[projectId].totalPostsThisCycle = (store[projectId].totalPostsThisCycle ?? 0) + 1;
    saveStore(store);
  }
}

export function deactivateProject(projectId: string): void {
  const store = loadStore();
  if (store[projectId]) {
    store[projectId].active = false;
    saveStore(store);
  }
}
