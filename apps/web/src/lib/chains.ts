import { base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc } from "wagmi/chains";

export const supportedChains = [base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc] as const;

export type SupportedChainId = 1 | 10 | 56 | 137 | 8453 | 42161 | 421614;

export const chainLogos: Record<SupportedChainId, string> = {
  [base.id]: "/chains/base.svg",
  [polygon.id]: "/chains/polygon.svg",
  [arbitrum.id]: "/chains/arbitrum.svg",
  [arbitrumSepolia.id]: "/chains/arbitrum.svg",
  [optimism.id]: "/chains/optimism.svg",
  [mainnet.id]: "/chains/ethereum.svg",
  [bsc.id]: "/chains/bsc.svg",
};

export const chainColors: Record<SupportedChainId, string> = {
  [base.id]: "#0052FF",
  [polygon.id]: "#8247E5",
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

