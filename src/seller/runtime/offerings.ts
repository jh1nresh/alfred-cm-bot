// =============================================================================
// Dynamic loader for seller offerings.
// Offerings are stored per-agent: src/seller/offerings/<agent-name>/<offering>/
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { OfferingHandlers } from "./offeringTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** The parsed offering.json config. */

export interface OfferingConfig {
  name: string;
  description: string;
  price?: number;
  jobFee?: number;
  jobFeeType?: "fixed" | "percentage";
  requiredFunds?: boolean;
  tokenAddress?: string;
  schema?: Record<string, string>;
}

export interface LoadedOffering {
  config: OfferingConfig;
  handlers: OfferingHandlers;
}

function resolveOfferingsRoot(agentDirName: string): string {
  return path.resolve(__dirname, "..", "offerings", agentDirName);
}

/** Directories to always scan for offerings regardless of agent name. */
const GLOBAL_OFFERING_DIRS = ["twitter", "global"];

/**
 * Resolve all possible directories containing offerings for a given agent.
 * Includes the agent-specific dir + global offering dirs (twitter, global).
 */
function resolveAllOfferingDirs(agentDirName: string): string[] {
  const offeringsBase = path.resolve(__dirname, "..", "offerings");
  const dirs = [resolveOfferingsRoot(agentDirName)];

  for (const globalDir of GLOBAL_OFFERING_DIRS) {
    const p = path.resolve(offeringsBase, globalDir);
    if (!dirs.includes(p)) dirs.push(p);
  }

  return dirs;
}

/**
 * Find the directory of a specific named offering.
 * Searches agent-specific dir first, then global dirs.
 */
function findOfferingDir(offeringName: string, agentDirName: string): string | null {
  for (const dir of resolveAllOfferingDirs(agentDirName)) {
    const candidate = path.join(dir, offeringName);
    if (fs.existsSync(path.join(candidate, "offering.json"))) {
      return candidate;
    }
  }
  return null;
}

/**
 * Load a named offering from any of the offering directories.
 * Searches: `src/seller/offerings/<agentDirName>/<name>/`
 * and global dirs: `src/seller/offerings/twitter/<name>/`, etc.
 */
export async function loadOffering(
  offeringName: string,
  agentDirName: string
): Promise<LoadedOffering> {
  const offeringDir = findOfferingDir(offeringName, agentDirName);
  if (!offeringDir) {
    throw new Error(
      `Offering "${offeringName}" not found in any offerings directory (agent: ${agentDirName})`
    );
  }

  // offering.json
  const configPath = path.join(offeringDir, "offering.json");
  const config: OfferingConfig = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  );

  // handlers.ts (dynamically imported)
  const handlersPath = path.join(offeringDir, "handlers.ts");
  if (!fs.existsSync(handlersPath)) {
    throw new Error(`handlers.ts not found: ${handlersPath}`);
  }

  const handlers = (await import(handlersPath)) as OfferingHandlers;

  if (typeof handlers.executeJob !== "function") {
    throw new Error(
      `handlers.ts in "${offeringName}" must export an executeJob function`
    );
  }

  return { config, handlers };
}

/**
 * List all available offering names — agent-specific + global directories.
 */
export function listOfferings(agentDirName: string): string[] {
  const allNames = new Set<string>();

  for (const dir of resolveAllOfferingDirs(agentDirName)) {
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .forEach((d) => allNames.add(d.name));
  }

  return [...allNames];
}
