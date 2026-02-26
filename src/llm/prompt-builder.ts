import { getProjectConfig, loadKnowledgeFile } from '../config/loader.js';

const BASE_SYSTEM_PROMPT = `You are Curator, a helpful Web3 community manager. Answer technical questions about DeFi, smart contracts, and blockchain clearly and concisely. Be friendly but accurate.`;

/**
 * Build the complete system prompt for a specific guild
 * Includes base prompt, project-specific instructions, and knowledge files
 */
export function buildSystemPrompt(guildId: string): string {
  const config = getProjectConfig(guildId);

  const parts: string[] = [BASE_SYSTEM_PROMPT];

  // Add project-specific instructions
  if (config.systemPromptExtra && config.systemPromptExtra.trim().length > 0) {
    parts.push(`\n\n## Project Context\n${config.systemPromptExtra}`);
  }

  // Add knowledge from files
  if (config.knowledgeFiles && config.knowledgeFiles.length > 0) {
    const knowledgeParts: string[] = [];

    for (const filePath of config.knowledgeFiles) {
      const content = loadKnowledgeFile(filePath);
      if (content.trim().length > 0) {
        knowledgeParts.push(content);
      }
    }

    if (knowledgeParts.length > 0) {
      parts.push(`\n\n## Project Knowledge\n${knowledgeParts.join('\n\n---\n\n')}`);
    }
  }

  return parts.join('');
}
