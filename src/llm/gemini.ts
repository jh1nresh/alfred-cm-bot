import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { buildSystemPrompt } from './prompt-builder.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cache models per guildId to avoid recreating them
const modelCache = new Map<string, GenerativeModel>();

const FALLBACK_MESSAGE =
  "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";

/**
 * Get or create a model for a specific guild with customized system prompt
 */
function getModelForGuild(guildId: string): GenerativeModel {
  if (modelCache.has(guildId)) {
    return modelCache.get(guildId)!;
  }

  const systemPrompt = buildSystemPrompt(guildId);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: 500,
    },
  });

  modelCache.set(guildId, model);
  console.log(`[Gemini] Created model for guild ${guildId}`);

  return model;
}

export async function generateReply(userMessage: string, guildId: string): Promise<string> {
  try {
    const model = getModelForGuild(guildId);
    const result = await model.generateContent(userMessage);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return FALLBACK_MESSAGE;
    }

    return text;
  } catch (error) {
    console.error('[Gemini Error]', error);
    return FALLBACK_MESSAGE;
  }
}

/**
 * Clear the model cache (useful for hot-reloading configs)
 */
export function clearModelCache(): void {
  modelCache.clear();
}
