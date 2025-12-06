import { createConfig } from "wagmi";
import { base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { getRpcUrlList } from "dex-blog-sdk";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

function isRetriableStatus(status: number) {
  return status === 429 || status === 408 || status === 500 || status === 502 || status === 503 || status === 504;
}

function fallbackTransport(chainId: number) {
  return () => ({
    async request({ method, params }) {
      const candidates = await getRpcUrlList(chainId);
      if (!candidates.length) {
        throw new Error(`No RPC candidates for chain ${chainId}`);
      }

      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      });

      let lastError: any = null;

      for (const url of candidates) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!res.ok) {
            if (isRetriableStatus(res.status)) {
              lastError = new Error(`HTTP ${res.status} from ${url}`);
              continue;
            }
            throw new Error(`HTTP ${res.status} from ${url}`);
          }

          const json = await res.json();
          if (json.error) {
            const code = json.error?.code;
            if (code === -32016 || code === -32005 || code === -32603) {
              lastError = new Error(`RPC error ${code} from ${url}`);
              continue;
            }
            throw new Error(json.error?.message || "RPC error");
          }

          return json.result;
        } catch (err: any) {
          clearTimeout(timeout);
          lastError = err;
          // Try next candidate
          continue;
        }
      }

      throw lastError || new Error(`All RPC candidates failed for chain ${chainId}`);
    },
  });
}

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
    [base.id]: fallbackTransport(base.id),
    [polygon.id]: fallbackTransport(polygon.id),
    [arbitrum.id]: fallbackTransport(arbitrum.id),
    [arbitrumSepolia.id]: fallbackTransport(arbitrumSepolia.id),
    [optimism.id]: fallbackTransport(optimism.id),
    [mainnet.id]: fallbackTransport(mainnet.id),
    [bsc.id]: fallbackTransport(bsc.id),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

