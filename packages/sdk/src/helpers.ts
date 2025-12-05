import { ethers } from "ethers";
import { DexBlog } from "./DexBlog";
import { DexBlogFactory } from "./DexBlogFactory";
import { getChainConfig, getFactoryAddress, getDefaultRpcUrl, isChainSupported } from "./chains";

/**
 * Get a DexBlog instance for a specific blog address
 * @param blogAddress Blog contract address
 * @param chainId Chain ID
 * @param options Optional provider or signer
 * @returns DexBlog instance
 */
export function getBlog(
  blogAddress: string,
  chainId: number,
  options?: {
    provider?: ethers.Provider;
    signer?: ethers.Signer;
    rpcUrl?: string;
  }
): DexBlog {
  const config = getChainConfig(chainId);
  if (!config) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  const providerOrSigner = options?.signer || options?.provider;
  let provider: ethers.Provider;

  if (options?.signer) {
    provider = options.signer.provider as ethers.Provider;
  } else if (options?.provider) {
    provider = options.provider;
  } else {
    const rpcUrl = options?.rpcUrl || config.rpcUrl;
    provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  }

  return new DexBlog({
    address: blogAddress,
    chainId,
    provider,
    signer: options?.signer,
  });
}

/**
 * Get a DexBlogFactory instance
 * @param chainId Chain ID
 * @param options Optional provider or signer
 * @returns DexBlogFactory instance
 */
export function getFactory(
  chainId: number,
  options?: {
    provider?: ethers.Provider;
    signer?: ethers.Signer;
    rpcUrl?: string;
  }
): DexBlogFactory {
  const config = getChainConfig(chainId);
  if (!config) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  if (!isChainSupported(chainId)) {
    throw new Error(`Chain ${chainId} is supported but factory is not deployed yet`);
  }

  const providerOrSigner = options?.signer || options?.provider;
  let provider: ethers.Provider;

  if (options?.signer) {
    provider = options.signer.provider as ethers.Provider;
  } else if (options?.provider) {
    provider = options.provider;
  } else {
    const rpcUrl = options?.rpcUrl || config.rpcUrl;
    provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  }

  return new DexBlogFactory({
    address: config.factoryAddress,
    chainId,
    provider,
    signer: options?.signer,
  });
}

/**
 * Get a provider for a chain
 * @param chainId Chain ID
 * @param rpcUrl Optional custom RPC URL
 * @returns Provider instance
 */
export function getProvider(chainId: number, rpcUrl?: string): ethers.Provider {
  const defaultRpcUrl = getDefaultRpcUrl(chainId);
  const finalRpcUrl = rpcUrl || defaultRpcUrl;
  
  if (!finalRpcUrl) {
    throw new Error(`No RPC URL available for chain ${chainId}`);
  }

  return new ethers.JsonRpcProvider(finalRpcUrl, chainId);
}

