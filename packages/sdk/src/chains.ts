/**
 * Chain configuration for DexBlog SDK
 * Contains factory contract addresses and default RPC URLs for supported chains
 */

export interface DexBlogChainConfig {
  /** Chain ID */
  id: number;
  /** Chain name */
  name: string;
  /** Factory contract address */
  factoryAddress: string;
  /** Default RPC URL */
  rpcUrl: string;
  /** Block explorer URL */
  blockExplorer: string;
}

/**
 * Factory contract addresses per chain
 * Update these after deploying to each chain
 */
export const FACTORY_ADDRESSES: Record<number, string> = {
  1: "0x0000000000000000000000000000000000000000", // Ethereum Mainnet - Not deployed yet
  10: "0x96e8005727eCAd421B4cdded7B08d240f522D96E", // ✅ Optimism Mainnet
  56: "0x96e8005727eCAd421B4cdded7B08d240f522D96E", // ✅ BNB Smart Chain
  137: "0x0000000000000000000000000000000000000000", // Polygon - Not deployed yet
  8453: "0x8Ccc0Bb6AF35F9067A7110Ac50666159e399A5F3", // ✅ Base Mainnet
  42161: "0x243924EEE57aa31832A957c11416AB34f5009a67", // ✅ Arbitrum Mainnet (with ArbSys L2 blockNumber fix)
  421614: "0xccb9EFF798D12D78d179c81aEC83c9E9F974013B", // ✅ Arbitrum Sepolia
};

/**
 * Default RPC URLs per chain
 * Uses public RPC endpoints - users can override with their own
 */
export const DEFAULT_RPC_URLS: Record<number, string> = {
  1: "https://eth.drpc.org",
  10: "https://optimism.drpc.org",
  56: "https://bsc.drpc.org",
  137: "https://polygon.drpc.org",
  8453: "https://base.drpc.org",
  42161: "https://arbitrum.drpc.org",
  421614: "https://arbitrum-sepolia.drpc.org",
};

/**
 * Block explorer URLs per chain
 */
export const BLOCK_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  56: "https://bscscan.com",
  137: "https://polygonscan.com",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  421614: "https://sepolia.arbiscan.io",
};

/**
 * Chain names mapping
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  10: "Optimism",
  56: "BNB Smart Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  421614: "Arbitrum Sepolia",
};

/**
 * Get chain configuration
 * @param chainId Chain ID
 * @returns Chain configuration or null if not supported
 */
export function getChainConfig(chainId: number): DexBlogChainConfig | null {
  const factoryAddress = FACTORY_ADDRESSES[chainId];
  const rpcUrl = DEFAULT_RPC_URLS[chainId];
  const blockExplorer = BLOCK_EXPLORERS[chainId];
  const name = CHAIN_NAMES[chainId];

  if (!factoryAddress || !rpcUrl || !blockExplorer || !name) {
    return null;
  }

  return {
    id: chainId,
    name,
    factoryAddress,
    rpcUrl,
    blockExplorer,
  };
}

/**
 * Get factory address for a chain
 * @param chainId Chain ID
 * @returns Factory address or null if not supported
 */
export function getFactoryAddress(chainId: number): string | null {
  return FACTORY_ADDRESSES[chainId] || null;
}

/**
 * Get default RPC URL for a chain
 * @param chainId Chain ID
 * @returns RPC URL or null if not supported
 */
export function getDefaultRpcUrl(chainId: number): string | null {
  return DEFAULT_RPC_URLS[chainId] || null;
}

/**
 * Check if a chain is supported
 * @param chainId Chain ID
 * @returns True if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in FACTORY_ADDRESSES && FACTORY_ADDRESSES[chainId] !== "0x0000000000000000000000000000000000000000";
}

/**
 * Get all supported chain IDs
 * @returns Array of supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(FACTORY_ADDRESSES)
    .map(Number)
    .filter((chainId) => isChainSupported(chainId));
}

