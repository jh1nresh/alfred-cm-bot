import { Client, MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { ethers } from 'ethers';

const HELPFUL_REACTION_THRESHOLD = parseInt(process.env.HELPFUL_REACTION_THRESHOLD || '3', 10);
const CHECKMARK_EMOJI = '✅';

// On-chain payout configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// CMTreasury ABI (only the payout function we need)
const CM_TREASURY_ABI = [
  'function payout(bytes32 replyId) external',
  'function paidReplies(bytes32) view returns (bool)',
];

// Track message IDs that have already triggered payout to avoid double-triggering
const triggeredMessageIds = new Set<string>();

// Ethers provider and contract (initialized if config present)
let contract: ethers.Contract | null = null;
let wallet: ethers.Wallet | null = null;

/**
 * Initialize on-chain payout if configured
 */
function initializeOnChainPayout(): boolean {
  if (!CONTRACT_ADDRESS || !BOT_PRIVATE_KEY) {
    console.log('[Reaction Tracker] On-chain payout not configured (missing CONTRACT_ADDRESS or BOT_PRIVATE_KEY)');
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    wallet = new ethers.Wallet(BOT_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CM_TREASURY_ABI, wallet);

    console.log(`[Reaction Tracker] On-chain payout enabled`);
    console.log(`[Reaction Tracker] Contract: ${CONTRACT_ADDRESS}`);
    console.log(`[Reaction Tracker] Bot wallet: ${wallet.address}`);

    return true;
  } catch (error) {
    console.error('[Reaction Tracker] Failed to initialize on-chain payout:', error);
    return false;
  }
}

/**
 * Convert a message ID to a bytes32 for the contract
 */
function messageIdToBytes32(messageId: string): string {
  // Pad the message ID (snowflake) to 32 bytes
  // Discord snowflakes are 64-bit integers, so we pad with zeros
  const hex = BigInt(messageId).toString(16).padStart(64, '0');
  return '0x' + hex;
}

/**
 * Trigger on-chain payout for a message
 */
async function triggerOnChainPayout(messageId: string): Promise<boolean> {
  if (!contract || !wallet) {
    return false;
  }

  const replyId = messageIdToBytes32(messageId);

  try {
    // Check if already paid on-chain
    const alreadyPaid = await contract.paidReplies(replyId);
    if (alreadyPaid) {
      console.log(`[Reaction Tracker] Message ${messageId} already paid on-chain`);
      return true;
    }

    console.log(`[Reaction Tracker] Initiating on-chain payout for message ${messageId}...`);

    const tx = await contract.payout(replyId);
    console.log(`[Reaction Tracker] Payout tx submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Reaction Tracker] Payout confirmed in block ${receipt.blockNumber}`);

    return true;
  } catch (error) {
    console.error(`[Reaction Tracker] On-chain payout failed for message ${messageId}:`, error);
    return false;
  }
}

export function setupReactionTracker(client: Client): void {
  // Initialize on-chain payout if configured
  const onChainEnabled = initializeOnChainPayout();

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

          // Try on-chain payout if enabled
          if (onChainEnabled) {
            await triggerOnChainPayout(message.id);
          }
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
