const MAIAT_API_BASE = 'https://maiat-protocol.vercel.app/api/v1/score';
const TIMEOUT_MS = 3000;

/**
 * Get trust score from Maiat Protocol API
 * Returns score (0-100) or null if not found / invalid address / error
 * Fail-open: returns null on any error (including timeout)
 */
export async function getTrustScore(address: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${MAIAT_API_BASE}/${address}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[Maiat] Non-OK response for ${address}: ${response.status}`);
      return null;
    }

    const data = await response.json() as { score?: number };

    if (typeof data.score === 'number') {
      console.log(`[Maiat] Trust score for ${address}: ${data.score}`);
      return data.score;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[Maiat] Timeout fetching trust score for ${address}`);
    } else {
      console.error(`[Maiat] Error fetching trust score for ${address}:`, error);
    }
    // Fail open - return null on error
    return null;
  }
}
