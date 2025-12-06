import { base, arbitrum, arbitrumSepolia, optimism, mainnet, bsc } from "wagmi/chains";

const arbitrumTestnet = { ...arbitrumSepolia, name: "Arb. Testnet" } as const;
const bnb = { ...bsc, name: "BNB" } as const;

// Chains available in the UI (Ethereum shows popup when selected)
export const supportedChains = [base, arbitrum, arbitrumTestnet, optimism, mainnet, bnb] as const;

export type SupportedChainId = 1 | 10 | 56 | 8453 | 42161 | 421614;

export const chainLogos: Record<SupportedChainId, string> = {
  [base.id]: "/chains/base.svg",
  [arbitrum.id]: "/chains/arbitrum.svg",
  [arbitrumSepolia.id]: "/chains/arbitrum.svg",
  [optimism.id]: "/chains/optimism.svg",
  [mainnet.id]: "/chains/ethereum.svg",
  [bsc.id]: "/chains/bsc.svg",
};

export const chainColors: Record<SupportedChainId, string> = {
  [base.id]: "#0052FF",
  [arbitrum.id]: "#28A0F0",
  [arbitrumSepolia.id]: "#28A0F0",
  [optimism.id]: "#FF0420",
  [mainnet.id]: "#627EEA",
  [bsc.id]: "#F0B90B",
};

export function getChainName(chainId: number): string {
  const chain = supportedChains.find((c) => c.id === chainId);
  return chain?.name || "Unknown";
}

export function getChainById(chainId: number) {
  return supportedChains.find((c) => c.id === chainId);
}

