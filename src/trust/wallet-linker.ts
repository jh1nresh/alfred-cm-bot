// In-memory Map: userId (Discord) → walletAddress
const linkedWallets = new Map<string, string>();

// Ethereum address regex: 0x followed by 40 hex characters
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Validate that a string is a valid Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

/**
 * Link a wallet address to a Discord user ID
 */
export function linkWallet(userId: string, address: string): void {
  linkedWallets.set(userId, address.toLowerCase());
  console.log(`[Wallet] Linked wallet ${address} to user ${userId}`);
}

/**
 * Get the linked wallet address for a Discord user ID
 * Returns null if no wallet is linked
 */
export function getLinkedWallet(userId: string): string | null {
  return linkedWallets.get(userId) ?? null;
}

/**
 * Check if a user has a linked wallet
 */
export function hasLinkedWallet(userId: string): boolean {
  return linkedWallets.has(userId);
}

/**
 * Remove a wallet link (useful for testing or user requests)
 */
export function unlinkWallet(userId: string): boolean {
  return linkedWallets.delete(userId);
}

/**
 * Get all linked wallets (for debugging)
 */
export function getAllLinkedWallets(): Map<string, string> {
  return new Map(linkedWallets);
}
