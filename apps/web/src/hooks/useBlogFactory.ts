"use client";

import {
  useReadContract,
  useWriteContract,
  useChainId,
  useAccount,
  usePublicClient,
} from "wagmi";
import {
  getFactoryAddress,
  FACTORY_ABI,
  getUSDCAddress,
  USDC_DECIMALS,
  ERC20_ABI,
} from "@/lib/contracts";
import { useState } from "react";
import { parseUnits } from "viem";

export function useBlogFactory() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const factoryAddress = getFactoryAddress(chainId);
  const usdcAddress = getUSDCAddress(chainId);
  const [isCreating, setIsCreating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: setupFee, isLoading: isLoadingFee } = useReadContract({
    address: factoryAddress || undefined,
    abi: FACTORY_ABI,
    functionName: "setupFee",
    query: {
      enabled: !!factoryAddress,
    },
  });

  const { data: totalBlogs, isLoading: isLoadingTotal } = useReadContract({
    address: factoryAddress || undefined,
    abi: FACTORY_ABI,
    functionName: "totalBlogs",
    query: {
      enabled: !!factoryAddress,
    },
  });

  const { data: allowance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && factoryAddress ? [address, factoryAddress] : undefined,
    query: {
      enabled: !!usdcAddress && !!address && !!factoryAddress,
    },
  });

  const { writeContractAsync } = useWriteContract();

  const createBlog = async (name: string): Promise<string | null> => {
    if (!factoryAddress) {
      console.error("Factory not deployed on this chain. Please deploy the factory first.");
      throw new Error("Factory contract not deployed on this chain");
    }
    
    if (!usdcAddress || !address || !publicClient) {
      console.error("USDC address or user address not available");
      return null;
    }

    const fee = setupFee || parseUnits("10", USDC_DECIMALS[chainId] || 6);
    
    // Validate factory address is not zero
    if (factoryAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Factory contract not deployed on this chain");
    }

    try {
      // Step 1: Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, factoryAddress],
      });

      // Step 2: Approve if needed
      if (!currentAllowance || currentAllowance < fee) {
        setIsApproving(true);
        const approveHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [factoryAddress, fee],
        });
        
        // Wait for approval transaction
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setIsApproving(false);
      }

      // Step 3: Create blog
      setIsCreating(true);
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "createBlog",
        args: [name],
      });

      console.log("Transaction hash:", hash);
      return hash;
    } catch (error) {
      console.error("Failed to create blog with stablecoin:", error);
      throw error;
    } finally {
      setIsCreating(false);
      setIsApproving(false);
    }
  };

  return {
    factoryAddress,
    usdcAddress,
    setupFee: setupFee as bigint | undefined,
    totalBlogs: totalBlogs ? Number(totalBlogs) : undefined,
    allowance: allowance as bigint | undefined,
    needsApproval: allowance && setupFee ? allowance < setupFee : false,
    isLoadingFee,
    isLoadingTotal,
    createBlog,
    isCreating,
    isApproving,
  };
}

