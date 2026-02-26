import {
  Client,
  GatewayIntentBits,
  Partials,
  Message,
  Events,
} from 'discord.js';
import { generateReply } from './llm/gemini.js';
import { setupReactionTracker } from './reactions/tracker.js';
import { getProjectConfig } from './config/loader.js';
import { getTrustScore } from './trust/maiat.js';
import { linkWallet, getLinkedWallet, isValidEthAddress } from './trust/wallet-linker.js';

// Validate required environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN environment variable is required');
}

const WATCH_CHANNEL_IDS_RAW = process.env.WATCH_CHANNEL_IDS;
if (!WATCH_CHANNEL_IDS_RAW) {
  throw new Error('WATCH_CHANNEL_IDS environment variable is required');
}

const WATCH_CHANNEL_IDS = new Set(
  WATCH_CHANNEL_IDS_RAW.split(',').map((id) => id.trim()).filter(Boolean)
);

if (WATCH_CHANNEL_IDS.size === 0) {
  throw new Error('WATCH_CHANNEL_IDS must contain at least one channel ID');
}

const CHECKMARK_EMOJI = '✅';
const LINK_COMMAND_PREFIX = '!link ';
const LOW_TRUST_THRESHOLD = 30;
const IGNORE_TRUST_THRESHOLD = 10;

// Create Discord client with required intents and partials
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Handle ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`[Alfred] Logged in as ${readyClient.user.tag}`);
  console.log(`[Alfred] Watching channels: ${Array.from(WATCH_CHANNEL_IDS).join(', ')}`);

  // Initialize reaction tracker
  setupReactionTracker(client);
});

/**
 * Handle the !link command to link a wallet address
 */
async function handleLinkCommand(message: Message, address: string): Promise<void> {
  const trimmedAddress = address.trim();

  if (!isValidEthAddress(trimmedAddress)) {
    await message.reply('❌ Invalid Ethereum address. Please provide a valid address starting with 0x followed by 40 hex characters.');
    return;
  }

  linkWallet(message.author.id, trimmedAddress);
  await message.reply('✅ Wallet linked! Your trust score will now be checked.');
}

/**
 * Check trust score and determine if message should be processed
 * Returns: 'proceed' | 'warn' | 'ignore'
 */
async function checkTrustScore(userId: string): Promise<'proceed' | 'warn' | 'ignore'> {
  const walletAddress = getLinkedWallet(userId);

  // No wallet linked - proceed normally
  if (!walletAddress) {
    return 'proceed';
  }

  const score = await getTrustScore(walletAddress);

  // API error or not found - fail open, proceed normally
  if (score === null) {
    return 'proceed';
  }

  // Very low trust score - silently ignore
  if (score < IGNORE_TRUST_THRESHOLD) {
    console.log(`[FLAGGED] User ${userId} with wallet ${walletAddress} has trust score ${score} (< ${IGNORE_TRUST_THRESHOLD}). Ignoring message.`);
    return 'ignore';
  }

  // Low trust score - warn
  if (score < LOW_TRUST_THRESHOLD) {
    console.log(`[FLAGGED] User ${userId} with wallet ${walletAddress} has trust score ${score} (< ${LOW_TRUST_THRESHOLD}). Flagging for review.`);
    return 'warn';
  }

  // Good trust score - proceed
  return 'proceed';
}

// Handle incoming messages
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) {
    return;
  }

  // Only respond in watched channels
  if (!WATCH_CHANNEL_IDS.has(message.channelId)) {
    return;
  }

  // Handle !link command
  if (message.content.toLowerCase().startsWith(LINK_COMMAND_PREFIX.toLowerCase())) {
    const address = message.content.slice(LINK_COMMAND_PREFIX.length);
    await handleLinkCommand(message, address);
    return;
  }

  // Check trust score
  const trustResult = await checkTrustScore(message.author.id);

  if (trustResult === 'ignore') {
    // Silently ignore message from very low trust score users
    return;
  }

  if (trustResult === 'warn') {
    // Warn user about low trust score
    await message.reply('⚠️ Low trust score detected. Your message has been flagged for review.');
    // Still proceed with generating a reply
  }

  try {
    // Show typing indicator while generating response
    const channel = message.channel;
    if ('sendTyping' in channel) {
      await channel.sendTyping();
    }

    // Get guild ID for project-specific config
    const guildId = message.guildId ?? 'default';

    // Check if project config is expired (ACP subscription)
    const config = getProjectConfig(guildId);
    if (config?.expiresAt && new Date(config.expiresAt) < new Date()) {
      // Subscription expired — don't respond
      console.log(`[Alfred] Subscription expired for guild ${guildId} (expired: ${config.expiresAt})`);
      return;
    }

    // Generate reply using Gemini with guild-specific prompt
    const reply = await generateReply(message.content, guildId);

    // Send the reply
    const sentMessage = await message.reply(reply);

    // Add ✅ emoji reaction to invite voting
    await sentMessage.react(CHECKMARK_EMOJI);

    console.log(
      `[Alfred] Replied to message ${message.id} in channel ${message.channelId}`
    );
  } catch (error) {
    console.error('[Alfred] Error handling message:', error);

    // Try to send an error message
    try {
      await message.reply(
        "I apologize, but I encountered an error while processing your message. Please try again."
      );
    } catch (replyError) {
      console.error('[Alfred] Failed to send error reply:', replyError);
    }
  }
});

// Handle errors
client.on(Events.Error, (error) => {
  console.error('[Alfred] Client error:', error);
});

// Login to Discord
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('[Alfred] Failed to login:', error);
  process.exit(1);
});

// Start ACP seller if configured
if (process.env.LITE_AGENT_API_KEY) {
  import("./seller/runtime/seller.js").then(({ startSeller }) => {
    console.log('[Alfred] Starting ACP seller runtime...');
    startSeller();
  }).catch((err) => {
    console.error('[Alfred] Failed to start ACP seller:', err);
  });
}
