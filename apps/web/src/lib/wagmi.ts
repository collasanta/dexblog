import { http, createConfig } from "wagmi";
import { base, polygon, arbitrum, optimism, mainnet, bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

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
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

