// =============================================================================
// Twitter API v2 client wrapper
// Uses twitter-api-v2 with OAuth 1.0a (app + user tokens)
// =============================================================================

import { TwitterApi, type TwitterApiReadWrite } from "twitter-api-v2";

export interface TwitterCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface TweetResult {
  id: string;
  text: string;
  url: string;
}

/**
 * Build a Twitter client for a specific project's credentials.
 * Credentials are stored per-project via env vars or passed directly.
 */
export function buildTwitterClient(creds: TwitterCredentials): TwitterApiReadWrite {
  return new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  }).readWrite;
}

/**
 * Build a Twitter client from environment variables (global/default account).
 */
export function buildDefaultTwitterClient(): TwitterApiReadWrite | null {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.warn("[twitter] Missing Twitter API credentials in env vars");
    return null;
  }

  return buildTwitterClient({ appKey, appSecret, accessToken, accessSecret });
}

/**
 * Post a tweet. Returns tweet id/url on success.
 */
export async function postTweet(
  client: TwitterApiReadWrite,
  text: string
): Promise<TweetResult> {
  const result = await client.v2.tweet(text);
  const tweetId = result.data.id;
  // We need to get the username to build the URL, use a placeholder if not available
  const tweetUrl = `https://x.com/i/web/status/${tweetId}`;
  console.log(`[twitter] Posted tweet ${tweetId}`);
  return { id: tweetId, text, url: tweetUrl };
}

/**
 * Post a tweet thread (multiple connected tweets).
 */
export async function postThread(
  client: TwitterApiReadWrite,
  tweets: string[]
): Promise<TweetResult[]> {
  const results: TweetResult[] = [];
  let replyToId: string | undefined;

  for (const text of tweets) {
    const payload: Parameters<typeof client.v2.tweet>[0] = replyToId
      ? { text, reply: { in_reply_to_tweet_id: replyToId } }
      : { text };

    const result = await client.v2.tweet(payload);
    const tweetId = result.data.id;
    results.push({ id: tweetId, text, url: `https://x.com/i/web/status/${tweetId}` });
    replyToId = tweetId;
  }

  console.log(`[twitter] Posted thread of ${tweets.length} tweets`);
  return results;
}

/**
 * Search recent tweets by keyword (requires Basic or Pro API access).
 */
export async function searchTweets(
  client: TwitterApiReadWrite,
  query: string,
  maxResults = 10
): Promise<Array<{ id: string; text: string; authorId: string }>> {
  try {
    const result = await client.v2.search(query, {
      max_results: maxResults,
      "tweet.fields": ["author_id", "text", "id"],
    });
    return result.data.data?.map((t) => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id ?? "",
    })) ?? [];
  } catch (err: any) {
    // Search may not be available on free tier
    console.warn(`[twitter] Search unavailable: ${err.message}`);
    return [];
  }
}

/**
 * Reply to a tweet.
 */
export async function replyToTweet(
  client: TwitterApiReadWrite,
  tweetId: string,
  text: string
): Promise<TweetResult> {
  const result = await client.v2.tweet({
    text,
    reply: { in_reply_to_tweet_id: tweetId },
  });
  const replyId = result.data.id;
  console.log(`[twitter] Replied to ${tweetId} → ${replyId}`);
  return { id: replyId, text, url: `https://x.com/i/web/status/${replyId}` };
}

/**
 * Get own user profile (to get username/handle).
 */
export async function getMyProfile(
  client: TwitterApiReadWrite
): Promise<{ id: string; username: string; name: string } | null> {
  try {
    const me = await client.v2.me({ "user.fields": ["username", "name"] });
    return { id: me.data.id, username: me.data.username, name: me.data.name };
  } catch (err: any) {
    console.error(`[twitter] Failed to get profile: ${err.message}`);
    return null;
  }
}
