import { ethers } from "ethers";
import { getDefaultRpcUrl, getRpcProviders } from "./chains";

type RpcCandidate = string;

export interface RpcOptions {
  envRpcUrl?: string;
  timeoutMs?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
  maxRetries?: number;
}

// Track failed RPCs per chain to avoid retrying them immediately
const failedRpcCache: Map<string, number> = new Map(); // url -> timestamp of failure
const FAILED_RPC_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown for failed RPCs

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

export function getRpcCandidates(chainId: number, options?: RpcOptions): RpcCandidate[] {
  const list: RpcCandidate[] = [];

  // Priority 1: User-provided RPC URL (highest priority)
  if (options?.envRpcUrl) {
    list.push(options.envRpcUrl);
  }

  // Priority 2: SDK default RPC (first in curated list)
  const sdkDefault = getDefaultRpcUrl(chainId);
  if (sdkDefault) list.push(sdkDefault);

  // Priority 3: Curated RPC providers (fallbacks)
  const curatedProviders = getRpcProviders(chainId);
  list.push(...curatedProviders);

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

function getDelay(base: number, multiplier: number, attempt: number): number {
  return Math.min(base * Math.pow(multiplier, attempt), 5000);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getRpcUrlWithFallback(
  chainId: number,
  options?: RpcOptions
): Promise<{ url: string; provider: ethers.JsonRpcProvider }> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const candidates = getRpcCandidates(chainId, options);

  if (!candidates.length) {
    throw new Error(`No RPC candidates found for chain ${chainId}`);
  }

  const errors: string[] = [];
  const baseDelay = options?.retryDelayMs ?? 500;
  const backoffMultiplier = options?.backoffMultiplier ?? 1.5;

  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      const provider = await tryProvider(url, chainId, timeoutMs);
      return { url, provider };
    } catch (e: any) {
      errors.push(`${url}: ${e?.message || e}`);
      const delayMs = getDelay(baseDelay, backoffMultiplier, i);
      await delay(delayMs);
    }
  }

  throw new Error(`All RPC candidates failed for chain ${chainId}. Errors: ${errors.join(" | ")}`);
}

export function getRpcUrlList(chainId: number, options?: RpcOptions): string[] {
  return getRpcCandidates(chainId, options);
}

/**
 * Check if an error is retryable (rate limit, network issue, CORS, etc.)
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || "";
  const errorString = String(error).toLowerCase();
  const code = error?.code;
  const infoCode = error?.info?.error?.code;
  
  // Check nested error info (ethers wraps JSON-RPC errors)
  const nestedMessage = error?.info?.error?.message?.toLowerCase() || "";
  
  // Check for CORS errors
  const isCorsError = 
    message.includes("cors") ||
    message.includes("access-control-allow-origin") ||
    message.includes("blocked by cors") ||
    message.includes("preflight") ||
    errorString.includes("cors") ||
    errorString.includes("access-control") ||
    errorString.includes("preflight");
  
  // Check for network/fetch failures
  const isNetworkFailure =
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("err_failed") ||
    message.includes("fetch failed") ||
    message.includes("errfailed") ||
    errorString.includes("failed to fetch") ||
    errorString.includes("err_failed") ||
    errorString.includes("errfailed") ||
    errorString.includes("networkerror") ||
    errorString.includes("network error");
  
  // Check for HTTP errors that should trigger rotation
  const isHttpError = 
    code === 429 || // Too Many Requests
    code === 408 || // Request Timeout
    code === 500 || // Internal Server Error
    code === 502 || // Bad Gateway
    code === 503 || // Service Unavailable
    code === 504;   // Gateway Timeout
  
  // Check for BAD_DATA errors with empty value (0x) - suggests RPC returned malformed data
  const isBadDataError = 
    code === "BAD_DATA" ||
    message.includes("could not decode result data") ||
    message.includes("bad data") ||
    errorString.includes("could not decode result data") ||
    errorString.includes("bad_data");
  
  // If BAD_DATA and value is empty (0x), it's likely an RPC issue, not a contract issue
  // Check multiple ways the value might be represented
  const isEmptyBadData = isBadDataError && (
    message.includes('value="0x"') ||
    message.includes('value="0x0"') ||
    message.includes("value=0x") ||
    message.includes("value=0x0") ||
    message.includes('"0x"') ||
    (error?.info?.value === "0x" || error?.info?.value === "0x0" || error?.info?.value === "") ||
    (error?.info && JSON.stringify(error.info).includes('"value":"0x"')) ||
    (error?.info && JSON.stringify(error.info).includes('"value":"0x0"'))
  );
  
  return (
    // Rate limiting (JSON-RPC codes)
    message.includes("rate limit") ||
    message.includes("over rate limit") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("-32016") ||
    message.includes("-32005") ||
    nestedMessage.includes("rate limit") ||
    nestedMessage.includes("over rate limit") ||
    errorString.includes("rate limit") ||
    errorString.includes("-32016") ||
    code === -32005 || // rate limit
    code === -32016 || // over rate limit
    infoCode === -32005 ||
    infoCode === -32016 ||
    // HTTP errors
    isHttpError ||
    // Network errors
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    message.includes("network") ||
    message.includes("server error") ||
    message.includes("bad response") ||
    code === "SERVER_ERROR" ||
    code === "NETWORK_ERROR" ||
    code === "TIMEOUT" ||
    // CORS errors
    isCorsError ||
    // Network/fetch failures
    isNetworkFailure ||
    // BAD_DATA with empty value (RPC returned malformed data)
    isEmptyBadData ||
    // Generic network errors (if no specific code but error message suggests network issue)
    (!code && (message.includes("fetch") || message.includes("request") || errorString.includes("network")))
  );
}

/**
 * Mark an RPC as failed (temporarily avoid it)
 */
function markRpcFailed(url: string): void {
  failedRpcCache.set(url, Date.now());
}

/**
 * Check if an RPC is currently in cooldown
 */
function isRpcInCooldown(url: string): boolean {
  const failedAt = failedRpcCache.get(url);
  if (!failedAt) return false;
  return Date.now() - failedAt < FAILED_RPC_COOLDOWN_MS;
}

/**
 * A resilient provider that automatically rotates RPCs on failures.
 * Wraps ethers JsonRpcProvider and handles retries transparently.
 */
export class ResilientProvider extends ethers.JsonRpcProvider {
  private rpcUrls: string[];
  private currentRpcIndex: number = 0;
  private chainId: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    rpcUrls: string[],
    chainId: number,
    options?: { maxRetries?: number; retryDelayMs?: number }
  ) {
    if (!rpcUrls.length) {
      throw new Error("At least one RPC URL is required");
    }
    // Initialize with first available RPC
    const firstAvailable = rpcUrls.find((url) => !isRpcInCooldown(url)) || rpcUrls[0];
    super(firstAvailable, chainId);
    
    this.rpcUrls = rpcUrls;
    this.chainId = chainId;
    this.currentRpcIndex = rpcUrls.indexOf(firstAvailable);
    this.maxRetries = options?.maxRetries ?? rpcUrls.length * 2;
    this.retryDelayMs = options?.retryDelayMs ?? 300;
  }

  private rotateRpc(): string {
    // Find next RPC that's not in cooldown
    for (let i = 1; i <= this.rpcUrls.length; i++) {
      const nextIndex = (this.currentRpcIndex + i) % this.rpcUrls.length;
      const url = this.rpcUrls[nextIndex];
      if (!isRpcInCooldown(url)) {
        this.currentRpcIndex = nextIndex;
        return url;
      }
    }
    // All RPCs in cooldown, just rotate to next
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;
    return this.rpcUrls[this.currentRpcIndex];
  }

  private getCurrentRpcUrl(): string {
    return this.rpcUrls[this.currentRpcIndex];
  }

  /**
   * Override _perform to add retry logic with RPC rotation
   */
  async _perform(req: ethers.PerformActionRequest): Promise<any> {
    let lastError: Error | undefined;
    const attemptedUrls = new Set<string>();
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const currentUrl = this.getCurrentRpcUrl();
      attemptedUrls.add(currentUrl);
      
      try {
        // Create a temporary provider for this attempt
        const tempProvider = new ethers.JsonRpcProvider(currentUrl, this.chainId);
        
        // Perform the request with the temp provider
        const result = await (tempProvider as any)._perform(req);
        
        // Success - log if this wasn't the first attempt
        if (attempt > 0 && typeof window !== "undefined") {
          console.log(`[SDK] Successfully completed request after ${attempt + 1} attempts, using ${currentUrl}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Debug log to see error structure
        if (typeof window !== "undefined") {
          const isRetryable = isRetryableError(error);
          console.log(`[SDK] Error from ${currentUrl} (attempt ${attempt + 1}/${this.maxRetries}):`, {
            message: error?.message,
            code: error?.code,
            infoCode: error?.info?.error?.code,
            infoMessage: error?.info?.error?.message,
            infoValue: error?.info?.value,
            errorString: String(error),
            isRetryable,
            fullError: error,
          });
        }
        
        if (isRetryableError(error)) {
          markRpcFailed(currentUrl);
          const nextUrl = this.rotateRpc();
          
          // Determine error type for better logging
          const errorType = 
            String(error?.message || error).toLowerCase().includes("cors") ? "CORS error" :
            String(error?.message || error).toLowerCase().includes("failed to fetch") ? "network failure" :
            String(error?.message || error).toLowerCase().includes("rate limit") || error?.code === -32016 || error?.code === -32005 ? "rate-limited" :
            error?.code === "BAD_DATA" && String(error?.message || error).includes('value="0x"') ? "bad data (empty response)" :
            error?.code === "BAD_DATA" ? "bad data" :
            "network error";
          
          console.warn(
            `[SDK ResilientProvider] RPC ${currentUrl} ${errorType}. Rotating to ${nextUrl} (attempt ${attempt + 1}/${this.maxRetries})...`
          );
          
          // Exponential backoff delay
          const backoffDelay = this.retryDelayMs * Math.pow(1.5, attempt);
          await delay(Math.min(backoffDelay, 3000));
          continue;
        }
        
        // Non-retryable error (e.g., contract revert) - throw immediately
        throw error;
      }
    }
    
    // All retries exhausted
    const errorMessage = lastError?.message || String(lastError) || "Unknown error";
    const attemptedUrlsList = Array.from(attemptedUrls).join(", ");
    
    if (typeof window !== "undefined") {
      console.error(`[SDK] All RPC retries exhausted for chain ${this.chainId}. Attempted URLs: ${attemptedUrlsList}`);
    }
    
    throw lastError || new Error(`All RPC retries exhausted for chain ${this.chainId}. Attempted: ${attemptedUrlsList}`);
  }
}

/**
 * Creates a resilient provider with automatic RPC rotation on failures.
 * The provider will automatically try different RPCs when rate-limited or on network errors.
 */
export async function createFallbackProvider(
  chainId: number,
  options?: RpcOptions
): Promise<{ provider: ethers.Provider; url: string }> {
  const candidates = getRpcCandidates(chainId, options);
  
  if (!candidates.length) {
    throw new Error(`No RPC candidates found for chain ${chainId}`);
  }

  if (typeof window !== "undefined") {
    console.log(`[SDK] Creating fallback provider for chain ${chainId} with ${candidates.length} RPC candidates:`, candidates);
  }

  // Create resilient provider with all candidates
  const provider = new ResilientProvider(candidates, chainId, {
    maxRetries: options?.maxRetries ?? candidates.length * 2,
    retryDelayMs: options?.retryDelayMs ?? 300,
  });

  // Verify it works with a simple call (with timeout)
  const timeoutMs = options?.timeoutMs ?? 15000; // 15 seconds default timeout
  try {
    const networkPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Provider initialization timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    
    await Promise.race([networkPromise, timeoutPromise]);
    
    if (typeof window !== "undefined") {
      console.log(`[SDK] Successfully initialized provider for chain ${chainId}`);
    }
  } catch (e: any) {
    const errorMessage = e?.message || String(e);
    if (typeof window !== "undefined") {
      console.error(`[SDK] Failed to initialize provider for chain ${chainId}:`, errorMessage);
      console.error(`[SDK] Tried ${candidates.length} RPC candidates:`, candidates);
    }
    throw new Error(`Failed to initialize provider for chain ${chainId}: ${errorMessage}`);
  }

  return { provider, url: candidates[0] };
}

