// =============================================================================
// Configuration file management for ACP seller.
// Reads/writes config.json at the repo root.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repo root — two levels up from src/lib/ */
export const ROOT = path.resolve(__dirname, "..", "..");
export const CONFIG_JSON_PATH = path.resolve(ROOT, "config.json");
export const LOGS_DIR = path.resolve(ROOT, "logs");

export interface AgentEntry {
  id: string;
  name: string;
  walletAddress: string;
  apiKey: string | undefined;
  active: boolean;
}

export interface ConfigJson {
  LITE_AGENT_API_KEY?: string;
  SELLER_PID?: number;
  agents?: AgentEntry[];
}

export function readConfig(): ConfigJson {
  if (!fs.existsSync(CONFIG_JSON_PATH)) {
    return {};
  }
  try {
    const content = fs.readFileSync(CONFIG_JSON_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function writeConfig(config: ConfigJson): void {
  try {
    fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(config, null, 2) + "\n");
  } catch (err) {
    console.error(`Failed to write config.json: ${err}`);
  }
}

/** Load the API key from config.json or environment. */
export function loadApiKey(): string | undefined {
  if (process.env.LITE_AGENT_API_KEY?.trim()) {
    return process.env.LITE_AGENT_API_KEY.trim();
  }
  const config = readConfig();
  const key = config.LITE_AGENT_API_KEY;
  if (typeof key === "string" && key.trim()) {
    process.env.LITE_AGENT_API_KEY = key;
    return key;
  }
  return undefined;
}

/** Ensure API key is loaded, or exit with error. */
export function requireApiKey(): string {
  const key = loadApiKey();
  if (!key) {
    console.error(
      "Error: LITE_AGENT_API_KEY is not set. Run `acp setup` first."
    );
    process.exit(1);
  }
  return key;
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err.code !== "ESRCH";
  }
}

export function writePidToConfig(pid: number): void {
  try {
    const config = readConfig();
    config.SELLER_PID = pid;
    writeConfig(config);
  } catch (err) {
    console.error(`Failed to write PID to config.json: ${err}`);
  }
}

export function removePidFromConfig(): void {
  try {
    const config = readConfig();
    if (config.SELLER_PID !== undefined) {
      delete config.SELLER_PID;
      writeConfig(config);
    }
  } catch {
    // Best effort cleanup
  }
}

export function checkForExistingProcess(): void {
  const config = readConfig();

  if (config.SELLER_PID !== undefined) {
    if (isProcessRunning(config.SELLER_PID)) {
      console.error(
        `Seller process already running with PID: ${config.SELLER_PID}`
      );
      console.error(
        "Please stop the existing process before starting a new one."
      );
      process.exit(1);
    } else {
      removePidFromConfig();
    }
  }
}

/** Get the currently active agent from the agents array. */
export function getActiveAgent(): AgentEntry | undefined {
  const config = readConfig();
  return config.agents?.find((a) => a.active);
}

/** Sanitize an agent name for use as a directory name. */
export function sanitizeAgentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
