import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProjectConfig {
  guildId: string;
  projectName: string;
  payoutPerReply: number;
  reactionThreshold: number;
  watchChannelIds: string[];
  systemPromptExtra: string;
  knowledgeFiles: string[];
  faqContent?: string;
  expiresAt?: string;
  active?: boolean;
}

const DEFAULT_CONFIG: ProjectConfig = {
  guildId: 'default',
  projectName: 'Web3 Community',
  payoutPerReply: 0.10,
  reactionThreshold: 3,
  watchChannelIds: [],
  systemPromptExtra: '',
  knowledgeFiles: [],
};

// Cache loaded configs
const configCache = new Map<string, ProjectConfig>();

// Cache loaded knowledge files
const knowledgeCache = new Map<string, string>();

/**
 * Get project configuration by guild ID
 * Falls back to default config if no project-specific config found
 */
export function getProjectConfig(guildId: string): ProjectConfig {
  // Check cache first
  if (configCache.has(guildId)) {
    return configCache.get(guildId)!;
  }

  const projectRoot = path.resolve(__dirname, '../../..');
  const configPath = path.join(projectRoot, 'configs', 'projects', `${guildId}.json`);

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as ProjectConfig;
      configCache.set(guildId, config);
      console.log(`[Config] Loaded project config for guild ${guildId}: ${config.projectName}`);
      return config;
    }
  } catch (error) {
    console.error(`[Config] Error loading config for guild ${guildId}:`, error);
  }

  // Return default config
  console.log(`[Config] Using default config for guild ${guildId}`);
  return { ...DEFAULT_CONFIG, guildId };
}

/**
 * Load knowledge file content, cached and truncated to maxChars
 */
export function loadKnowledgeFile(filePath: string, maxChars: number = 2000): string {
  // Check cache first
  if (knowledgeCache.has(filePath)) {
    return knowledgeCache.get(filePath)!;
  }

  const projectRoot = path.resolve(__dirname, '../../..');
  const fullPath = path.join(projectRoot, filePath);

  try {
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf-8');

      // Truncate if necessary
      if (content.length > maxChars) {
        content = content.substring(0, maxChars) + '\n... (truncated)';
      }

      knowledgeCache.set(filePath, content);
      console.log(`[Config] Loaded knowledge file: ${filePath} (${content.length} chars)`);
      return content;
    }
  } catch (error) {
    console.error(`[Config] Error loading knowledge file ${filePath}:`, error);
  }

  return '';
}

/**
 * Clear all caches (useful for testing or hot-reloading)
 */
export function clearConfigCache(): void {
  configCache.clear();
  knowledgeCache.clear();
}

/**
 * Write project configuration to file
 * Used by ACP seller to provision new projects
 */
export async function writeProjectConfig(guildId: string, config: ProjectConfig): Promise<void> {
  const projectRoot = path.resolve(__dirname, '../../..');
  const configDir = path.join(projectRoot, 'configs', 'projects');
  const configPath = path.join(configDir, `${guildId}.json`);

  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Update cache
  configCache.set(guildId, config);

  console.log(`[Config] Wrote project config for guild ${guildId}: ${config.projectName}`);
}
