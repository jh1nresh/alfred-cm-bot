import { Client, MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';

const HELPFUL_REACTION_THRESHOLD = parseInt(process.env.HELPFUL_REACTION_THRESHOLD || '3', 10);
const CHECKMARK_EMOJI = '✅';

// Track message IDs that have already triggered payout to avoid double-triggering
const triggeredMessageIds = new Set<string>();

export function setupReactionTracker(client: Client): void {
  client.on(
    'messageReactionAdd',
    async (
      reaction: MessageReaction | PartialMessageReaction,
      user: User | PartialUser
    ) => {
      try {
        // Fetch partial reaction if needed
        if (reaction.partial) {
          try {
            await reaction.fetch();
          } catch (error) {
            console.error('[Reaction Tracker] Failed to fetch reaction:', error);
            return;
          }
        }

        // Only track ✅ reactions
        if (reaction.emoji.name !== CHECKMARK_EMOJI) {
          return;
        }

        const message = reaction.message;

        // Fetch partial message if needed
        if (message.partial) {
          try {
            await message.fetch();
          } catch (error) {
            console.error('[Reaction Tracker] Failed to fetch message:', error);
            return;
          }
        }

        // Only track reactions on messages sent by the bot
        if (message.author?.id !== client.user?.id) {
          return;
        }

        // Skip if already triggered
        if (triggeredMessageIds.has(message.id)) {
          return;
        }

        // Get the reaction count
        const count = reaction.count ?? 0;

        // Check if threshold is reached
        if (count >= HELPFUL_REACTION_THRESHOLD) {
          triggeredMessageIds.add(message.id);
          console.log(
            '[PAYOUT TRIGGERED] messageId:',
            message.id,
            'replyCount:',
            count
          );
        }
      } catch (error) {
        console.error('[Reaction Tracker] Error processing reaction:', error);
      }
    }
  );

  console.log(
    `[Reaction Tracker] Initialized with threshold: ${HELPFUL_REACTION_THRESHOLD}`
  );
}
