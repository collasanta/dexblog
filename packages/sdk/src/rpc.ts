import { ethers } from "ethers";
import { getDefaultRpcUrl } from "./chains";

type RpcCandidate = string;

interface RpcFetchCacheEntry {
  urls: RpcCandidate[];
  fetchedAt: number;
}

interface RpcOptions {
  envRpcUrl?: string;
  timeoutMs?: number;
}

const CHAINLIST_URL = "https://chainlist.org/rpcs.json";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const chainlistCache: Map<number, RpcFetchCacheEntry> = new Map();

function filterRpcUrls(urls: RpcCandidate[]): RpcCandidate[] {
  const seen = new Set<string>();
  return urls
    .filter((url) => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("https://")) // ignore ws
    .filter((url) => !url.toLowerCase().includes("api_key"))
    .filter((url) => !url.includes("$"))
    .filter((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    })
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

async function fetchChainlistRpcs(chainId: number): Promise<RpcCandidate[]> {
  const cached = chainlistCache.get(chainId);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.urls;
  }

  const res = await fetch(CHAINLIST_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch Chainlist RPCs: ${res.status}`);
  }
  const data = await res.json();
  const entry = Array.isArray(data)
    ? data.find((item) => Number(item.chainId) === chainId)
    : null;

  const urls = entry?.rpc
    ? filterRpcUrls(
        entry.rpc.map((r: any) => (typeof r === "string" ? r : r?.url)).filter(Boolean)
      )
    : [];

  chainlistCache.set(chainId, { urls, fetchedAt: now });
  return urls;
}

export async function getRpcCandidates(chainId: number, options?: RpcOptions): Promise<RpcCandidate[]> {
  const list: RpcCandidate[] = [];

  if (options?.envRpcUrl) {
    list.push(options.envRpcUrl);
  }

  const sdkDefault = getDefaultRpcUrl(chainId);
  if (sdkDefault) list.push(sdkDefault);

  try {
    const chainlistUrls = await fetchChainlistRpcs(chainId);
    list.push(...chainlistUrls);
  } catch (e) {
    // swallow fetch errors; fallback to existing list
  }

  return filterRpcUrls(list);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function tryProvider(url: string, chainId: number, timeoutMs: number) {
  const provider = new ethers.JsonRpcProvider(url, chainId);
  const network = await withTimeout(provider.getNetwork(), timeoutMs);
  if (network.chainId !== BigInt(chainId)) {
    throw new Error(`Chain ID mismatch: expected ${chainId}, got ${network.chainId}`);
  }
  return provider;
}

export async function getRpcUrlWithFallback(
  chainId: number,
  options?: RpcOptions
): Promise<{ url: string; provider: ethers.JsonRpcProvider }> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const candidates = await getRpcCandidates(chainId, options);

  if (!candidates.length) {
    throw new Error(`No RPC candidates found for chain ${chainId}`);
  }

  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const provider = await tryProvider(url, chainId, timeoutMs);
      return { url, provider };
    } catch (e: any) {
      errors.push(`${url}: ${e?.message || e}`);
      continue;
    }
  }

  throw new Error(`All RPC candidates failed for chain ${chainId}. Errors: ${errors.join(" | ")}`);
}

export async function getRpcUrlList(chainId: number, options?: RpcOptions): Promise<string[]> {
  return getRpcCandidates(chainId, options);
}

