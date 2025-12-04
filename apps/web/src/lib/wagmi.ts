import { http, createConfig } from "wagmi";
import { base, polygon, arbitrum, optimism, mainnet, bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

// dRPC public endpoints (free, no API key required)
const DRPC_URLS = {
  base: "https://base.drpc.org",
  polygon: "https://polygon.drpc.org",
  arbitrum: "https://arbitrum.drpc.org",
  optimism: "https://optimism.drpc.org",
  mainnet: "https://eth.drpc.org",
  bsc: "https://bsc.drpc.org",
};

export const config = createConfig({
  chains: [base, polygon, arbitrum, optimism, mainnet, bsc],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: "DexBlog",
        description: "Decentralized Blogging Platform",
        url: "https://dexblog.xyz",
        icons: ["https://dexblog.xyz/icon.png"],
      },
    }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || DRPC_URLS.base),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || DRPC_URLS.polygon),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || DRPC_URLS.arbitrum),
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

