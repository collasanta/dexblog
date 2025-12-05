import { http, createConfig } from "wagmi";
import { base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

// RPC endpoints (using public endpoints, can be overridden via env vars)
const DRPC_URLS = {
  // Base: Use public RPC endpoint (more reliable than dRPC for Base)
  base: "https://base-mainnet.g.alchemy.com/v2/demo", // Alchemy public demo endpoint (fallback to mainnet.base.org if fails)
  polygon: "https://polygon.drpc.org",
  arbitrum: "https://arbitrum.drpc.org",
  arbitrumSepolia: "https://arbitrum-sepolia.drpc.org", // dRPC Arbitrum Sepolia endpoint
  optimism: "https://optimism.drpc.org",
  mainnet: "https://eth.drpc.org",
  bsc: "https://bsc.drpc.org",
};

export const config = createConfig({
  chains: [base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc],
  connectors: [
    injected(),
    // Only add WalletConnect if projectId is configured
    ...(projectId ? [
      walletConnect({
        projectId,
        metadata: {
          name: "DexBlog",
          description: "Decentralized Blogging Platform",
          url: "https://dexblog.xyz",
          icons: ["https://dexblog.xyz/icon.png"],
        },
        showQrModal: true,
      })
    ] : []),
  ],
  transports: {
    // Base: Use env var if set, otherwise use official Base RPC (more reliable than dRPC)
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || DRPC_URLS.polygon),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || DRPC_URLS.arbitrum),
    [arbitrumSepolia.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || DRPC_URLS.arbitrumSepolia),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || DRPC_URLS.optimism),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || DRPC_URLS.mainnet),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || DRPC_URLS.bsc),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

