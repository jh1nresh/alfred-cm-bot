import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction:
    'You are Alfred, a helpful Web3 community manager. Answer technical questions about DeFi, smart contracts, and blockchain clearly and concisely. Be friendly but accurate.',
  generationConfig: {
    maxOutputTokens: 500,
  },
});

const FALLBACK_MESSAGE =
  "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";

export async function generateReply(userMessage: string): Promise<string> {
  try {
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
