import { ethers } from "ethers";

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface WalletClientLike extends EIP1193Provider {
  account?: { address?: string };
  chain?: { id?: number };
}

function assertEip1193Provider(provider: unknown): asserts provider is EIP1193Provider {
  if (!provider || typeof (provider as EIP1193Provider).request !== "function") {
    throw new Error("Provider must implement the EIP-1193 request method");
  }
}

export function eip1193ProviderToBrowserProvider(
  provider: EIP1193Provider,
  options?: { chainId?: number }
): ethers.BrowserProvider {
  assertEip1193Provider(provider);
  return new ethers.BrowserProvider(provider as ethers.Eip1193Provider, options?.chainId);
}

export async function eip1193ProviderToSigner(
  provider: EIP1193Provider,
  options?: { chainId?: number; address?: string }
): Promise<{ provider: ethers.BrowserProvider; signer: ethers.Signer }> {
  const browserProvider = eip1193ProviderToBrowserProvider(provider, options);
  const signer = await browserProvider.getSigner(options?.address);
  return { provider: browserProvider, signer };
}

export async function walletClientToEthers(
  walletClient: WalletClientLike,
  options?: { chainId?: number; address?: string }
): Promise<{ provider: ethers.BrowserProvider; signer: ethers.Signer; chainId: number }> {
  assertEip1193Provider(walletClient);

  const chainId = options?.chainId ?? walletClient.chain?.id;
  if (!chainId) {
    throw new Error("chainId is required to convert a wallet client to an ethers provider");
  }

  const provider = new ethers.BrowserProvider(walletClient as ethers.Eip1193Provider, chainId);
  const signer = await provider.getSigner(options?.address ?? walletClient.account?.address);

  return { provider, signer, chainId };
}

