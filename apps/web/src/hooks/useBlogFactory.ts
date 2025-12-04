"use client";

import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { getFactoryAddress, FACTORY_ABI } from "@/lib/contracts";
import { useState } from "react";

export function useBlogFactory() {
  const chainId = useChainId();
  const factoryAddress = getFactoryAddress(chainId);
  const [isCreating, setIsCreating] = useState(false);

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

  const { writeContractAsync } = useWriteContract();

  const createBlog = async (name: string): Promise<string | null> => {
    if (!factoryAddress) {
      console.error("Factory not deployed on this chain");
      return null;
    }

    setIsCreating(true);
    try {
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "createBlog",
        args: [name],
        value: setupFee || 0n,
      });

      // In a real app, you'd wait for the transaction and parse the event
      // For now, return the hash as a placeholder
      console.log("Transaction hash:", hash);

      // TODO: Parse BlogCreated event to get actual blog address
      return hash;
    } catch (error) {
      console.error("Failed to create blog:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    factoryAddress,
    setupFee: setupFee as bigint | undefined,
    totalBlogs: totalBlogs ? Number(totalBlogs) : undefined,
    isLoadingFee,
    isLoadingTotal,
    createBlog,
    isCreating,
  };
}

