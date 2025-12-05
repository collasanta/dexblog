"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Fetch ETH price in USD using CoinGecko API (free, no API key required)
 */
async function fetchEthPrice(): Promise<number> {
  try {
    // CoinGecko free API - no API key needed
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch ETH price");
    }
    
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    // Return a fallback price if API fails
    return 2500; // Approximate ETH price fallback
  }
}

/**
 * Hook to get current ETH price in USD
 * Updates every 60 seconds
 */
export function useEthPrice() {
  const { data: ethPrice, isLoading } = useQuery({
    queryKey: ["ethPrice"],
    queryFn: fetchEthPrice,
    refetchInterval: 60000, // Update every 60 seconds
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  return {
    ethPrice: ethPrice || 2500, // Fallback to $2500 if not loaded
    isLoading,
  };
}


