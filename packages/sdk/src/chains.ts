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
  /** USDC token address */
  usdcAddress: string;
  /** USDC decimals (6 on most chains, 18 on BSC) */
  usdcDecimals: number;
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
 * USDC token addresses per chain
 */
export const USDC_ADDRESSES: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum Mainnet
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // BNB Smart Chain (18 decimals)
  137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58cE87D3E1", // Arbitrum Sepolia
};

/**
 * USDC decimals per chain (6 for most, 18 for BSC)
 */
export const USDC_DECIMALS: Record<number, number> = {
  1: 6,
  10: 6,
  56: 18,
  137: 6,
  8453: 6,
  42161: 6,
  421614: 6,
};

/**
 * Curated RPC providers per chain
 * Handpicked reliable public RPC endpoints for better performance and reliability
 * First RPC in each array is the default/primary RPC
 */
export const RPC_PROVIDERS: Record<number, string[]> = {
  1: [
    "https://eth.llamarpc.com",
    "https://rpc.flashbots.net/fast",
    "https://1rpc.io/eth",
    "https://mainnet.gateway.tenderly.co",
    "https://ethereum-public.nodies.app",
  ],
  10: [
    "https://mainnet.optimism.io",
    "https://optimism.drpc.org",
    "https://optimism.api.onfinality.io/public",
    "https://public-op-mainnet.fastnode.io",
    "https://optimism-public.nodies.app",
  ],
  56: [
    "https://bsc-dataseed1.binance.org",
    "https://public-bsc-mainnet.fastnode.io",
    "https://bsc.rpc.blxrbdn.com",
    "https://1rpc.io/bnb",
    "https://bsc-mainnet.public.blastapi.io",
  ],
  137: [
    "https://polygon-rpc.com",
  ],
  8453: [
    "https://mainnet.base.org", // Official RPC first for reliable data
    "https://base.drpc.org",
    "https://base.gateway.tenderly.co",
    "https://base-public.nodies.app",
    "https://base.llamarpc.com",
  ],
  42161: [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arbitrum.drpc.org",
    "https://arbitrum.gateway.tenderly.co",
    "https://arbitrum-one.public.blastapi.io",
  ],
  421614: [
    "https://sepolia-rollup.arbitrum.io/rpc",
    "https://arbitrum-sepolia.drpc.org",
    "https://arbitrum-sepolia-rpc.publicnode.com",
    "https://arbitrum-sepolia.gateway.tenderly.co",
    "https://api.zan.top/arb-sepolia",
  ],
};

/**
 * Default RPC URLs per chain
 * Uses official/public RPC endpoints - users can override with their own
 * This is kept for backward compatibility - it uses the first RPC from RPC_PROVIDERS
 */
export const DEFAULT_RPC_URLS: Record<number, string> = {
  1: RPC_PROVIDERS[1]?.[0] || "https://ethereum.publicnode.com",
  10: RPC_PROVIDERS[10]?.[0] || "https://mainnet.optimism.io",
  56: RPC_PROVIDERS[56]?.[0] || "https://bsc-dataseed1.binance.org",
  137: RPC_PROVIDERS[137]?.[0] || "https://polygon-rpc.com",
  8453: RPC_PROVIDERS[8453]?.[0] || "https://mainnet.base.org",
  42161: RPC_PROVIDERS[42161]?.[0] || "https://arb1.arbitrum.io/rpc",
  421614: RPC_PROVIDERS[421614]?.[0] || "https://sepolia-rollup.arbitrum.io/rpc",
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
  const usdcAddress = USDC_ADDRESSES[chainId];
  const usdcDecimals = USDC_DECIMALS[chainId];

  if (!factoryAddress || !rpcUrl || !blockExplorer || !name || !usdcAddress || usdcDecimals === undefined) {
    return null;
  }

  return {
    id: chainId,
    name,
    factoryAddress,
    rpcUrl,
    blockExplorer,
    usdcAddress,
    usdcDecimals,
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
 * Get curated RPC providers for a chain
 * @param chainId Chain ID
 * @returns Array of RPC URLs or empty array if not supported
 */
export function getRpcProviders(chainId: number): string[] {
  return RPC_PROVIDERS[chainId] || [];
}

/**
 * Get USDC address for a chain
 * @param chainId Chain ID
 * @returns USDC address or null if not supported
 */
export function getUsdcAddress(chainId: number): string | null {
  return USDC_ADDRESSES[chainId] || null;
}

/**
 * Get USDC decimals for a chain
 * @param chainId Chain ID
 * @returns USDC decimals or null if not supported
 */
export function getUsdcDecimals(chainId: number): number | null {
  const decimals = USDC_DECIMALS[chainId];
  return decimals === undefined ? null : decimals;
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

