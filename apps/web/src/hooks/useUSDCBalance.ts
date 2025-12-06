"use client";

import { useAccount, useChainId } from "wagmi";
import { getUSDCAddress, ERC20_ABI, USDC_DECIMALS } from "@/lib/contracts";
import { getAddress } from "viem";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useSdkProvider } from "./useSdkProvider";

/**
 * Shared hook for fetching USDC balance
 * Eliminates duplicate queries across components
 */
export function useUSDCBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { provider: sdkProvider } = useSdkProvider(chainId);
  const usdcAddressRaw = getUSDCAddress(chainId);
  
  // Ensure checksum address format
  const usdcAddress = usdcAddressRaw ? (getAddress(usdcAddressRaw) as `0x${string}`) : undefined;

  // Skip USDC balance query on Arbitrum Sepolia (testnet with 0 factory fee)
  const isArbitrumSepolia = chainId === 421614;
  
  const { data: usdcBalance, isLoading, error } = useQuery({
    queryKey: ["usdc-balance", usdcAddress, address, chainId],
    queryFn: async () => {
      if (!sdkProvider || !usdcAddress || !address) {
        return null;
      }
      
      try {
        const code = await sdkProvider.getCode(usdcAddress);
        if (!code || code === "0x") {
          console.warn("[useUSDCBalance] USDC contract does not exist at address:", usdcAddress);
          return 0n;
        }
        
        const contract = new ethers.Contract(usdcAddress, ERC20_ABI, sdkProvider);
        const balance = await contract.balanceOf(address);
        return typeof balance === "bigint" ? balance : BigInt(balance.toString());
      } catch (err) {
        console.error("[useUSDCBalance] Error reading USDC balance:", err);
        return 0n;
      }
    },
    enabled: !!sdkProvider && !!usdcAddress && !!address && !isArbitrumSepolia,
    staleTime: 30 * 1000,
    refetchInterval: false,
  });

  return {
    usdcBalance: usdcBalance as bigint | null | undefined,
    usdcAddress,
    decimals: USDC_DECIMALS[chainId] || 6,
    isLoading,
    error,
  };
}

