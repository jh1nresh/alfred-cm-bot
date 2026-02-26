import {
  Client,
  GatewayIntentBits,
  Partials,
  Message,
  Events,
  TextChannel,
} from 'discord.js';
import { generateReply } from './llm/gemini.js';
import { setupReactionTracker } from './reactions/tracker.js';

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

  try {
    // Show typing indicator while generating response
    const channel = message.channel;
    if ('sendTyping' in channel) {
      await channel.sendTyping();
    }

    // Generate reply using Gemini
    const reply = await generateReply(message.content);

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
