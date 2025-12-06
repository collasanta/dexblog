"use client";

import { useAccount, useChainId, usePublicClient } from "wagmi";
import { getUSDCAddress, ERC20_ABI, USDC_DECIMALS } from "@/lib/contracts";
import { getAddress } from "viem";
import { useQuery } from "@tanstack/react-query";

/**
 * Shared hook for fetching USDC balance
 * Eliminates duplicate queries across components
 */
export function useUSDCBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const usdcAddressRaw = getUSDCAddress(chainId);
  
  // Ensure checksum address format
  const usdcAddress = usdcAddressRaw ? (getAddress(usdcAddressRaw) as `0x${string}`) : undefined;

  // Skip USDC balance query on Arbitrum Sepolia (testnet with 0 factory fee)
  const isArbitrumSepolia = chainId === 421614;
  
  // Fetch USDC balance using publicClient directly (works better with proxy contracts)
  const { data: usdcBalance, isLoading, error } = useQuery({
    queryKey: ["usdc-balance", usdcAddress, address, chainId],
    queryFn: async () => {
      if (!publicClient || !usdcAddress || !address) {
        return null;
      }
      
      try {
        // First, check if contract exists by getting its bytecode
        const code = await publicClient.getBytecode({ address: usdcAddress });
        if (!code || code === "0x") {
          console.warn("[useUSDCBalance] USDC contract does not exist at address:", usdcAddress);
          return 0n;
        }
        
        // Try reading balance
        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        
        const balanceBigInt = typeof balance === 'bigint' ? balance : BigInt(balance.toString());
        return balanceBigInt;
      } catch (error: any) {
        // Check if it's a "no data" error (contract doesn't exist or doesn't have the function)
        if (error?.shortMessage?.includes("returned no data") || 
            error?.cause?.shortMessage?.includes("returned no data")) {
          console.warn("[useUSDCBalance] USDC contract may not exist or may not have balanceOf function");
          return 0n;
        }
        
        console.error("[useUSDCBalance] Error reading USDC balance:", error);
        // Don't throw - return 0n instead so UI doesn't break
        return 0n;
      }
    },
    enabled: !!publicClient && !!usdcAddress && !!address && !isArbitrumSepolia,
    staleTime: 30 * 1000, // 30 seconds - balance is important but doesn't change that often
    refetchInterval: false, // No polling - invalidate on user actions instead
  });

  return {
    usdcBalance: usdcBalance as bigint | null | undefined,
    usdcAddress,
    decimals: USDC_DECIMALS[chainId] || 6,
    isLoading,
    error,
  };
}

