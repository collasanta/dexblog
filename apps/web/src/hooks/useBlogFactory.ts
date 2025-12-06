"use client";

import {
  useWriteContract,
  useChainId,
  useAccount,
  usePublicClient,
  useBalance,
} from "wagmi";
import {
  getFactoryAddress,
  getUSDCAddress,
  USDC_DECIMALS,
  ERC20_ABI,
} from "@/lib/contracts";
import { useState, useEffect } from "react";
import { parseUnits, formatUnits, decodeEventLog, getAddress } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useUSDCBalance } from "./useUSDCBalance";
import { DexBlogFactory, getRpcUrlWithFallback } from "dex-blog-sdk";

export function useBlogFactory() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const factoryAddressRaw = getFactoryAddress(chainId);
  const factoryAddress = factoryAddressRaw ? (getAddress(factoryAddressRaw) as `0x${string}`) : null;
  const usdcAddressRaw = getUSDCAddress(chainId);
  const usdcAddress = usdcAddressRaw ? (getAddress(usdcAddressRaw) as `0x${string}`) : null;
  const [isCreating, setIsCreating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Use shared USDC balance hook
  const { usdcBalance } = useUSDCBalance();

  const [setupFee, setSetupFee] = useState<bigint | null>(null);
  const [totalBlogs, setTotalBlogs] = useState<bigint | null>(null);
  const [factoryOwner, setFactoryOwner] = useState<string | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isLoadingTotal, setIsLoadingTotal] = useState(false);

  const isFactoryOwner = address && factoryOwner && address.toLowerCase() === factoryOwner.toLowerCase();

  const { data: allowance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && factoryAddress ? [address, factoryAddress] : undefined,
    query: {
      enabled: !!usdcAddress && !!address && !!factoryAddress,
      staleTime: 10 * 1000, // 10 seconds
      refetchInterval: false, // No polling - invalidate after approve tx
    },
  });

  // Check native ETH balance for gas
  const { data: nativeBalance } = useBalance({
    address: address || undefined,
  });

  const { writeContractAsync } = useWriteContract();
  
  // Use fixed gas estimate instead of calculating every time
  const estimatedGas = isFactoryOwner ? 500000n : 600000n;
  
  // Get current gas price and calculate estimated cost
  const [estimatedGasCost, setEstimatedGasCost] = useState<bigint | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  // Estimate gas cost once when component mounts or chain changes
  useEffect(() => {
    const estimateGasCost = async () => {
      if (!publicClient || !address) return;
      
      setIsEstimatingGas(true);
      try {
        const gasPrice = await publicClient.getGasPrice();
        const totalCost = estimatedGas * gasPrice;
        setEstimatedGasCost(totalCost);
      } catch (error) {
        console.error("Failed to estimate gas cost:", error);
        // Use a fallback estimate if we can't get gas price
        setEstimatedGasCost(parseUnits("0.0001", 18));
      } finally {
        setIsEstimatingGas(false);
      }
    };

    estimateGasCost();
  }, [publicClient, address, estimatedGas]);

  useEffect(() => {
    const loadFactoryData = async () => {
      if (!factoryAddress || !chainId) return;
      try {
        setIsLoadingFee(true);
        setIsLoadingTotal(true);
        const { provider } = await getRpcUrlWithFallback(chainId, { timeoutMs: 8000 });
        const factory = new DexBlogFactory({
          address: factoryAddress,
          chainId,
          provider,
        });
        const [fee, total, owner] = await Promise.all([
          factory.getSetupFee(),
          factory.totalBlogs().then((n) => BigInt(n)),
          factory.getFactoryOwner(),
        ]);
        setSetupFee(fee);
        setTotalBlogs(total);
        setFactoryOwner(owner);
      } catch (e) {
        console.error("Failed to load factory data via SDK fallback:", e);
      } finally {
        setIsLoadingFee(false);
        setIsLoadingTotal(false);
      }
    };

    loadFactoryData();
  }, [factoryAddress, chainId]);

  const createBlog = async (name: string): Promise<{ blogAddress: string; txHash: string } | null> => {
    if (!factoryAddress) {
      console.error("Factory not deployed on this chain. Please deploy the factory first.");
      throw new Error("Factory contract not deployed on this chain, send an email to victor.collasanta@gmail.com and he will add this chain");
    }
    
    if (!address || !publicClient) {
      console.error("User address not available");
      return null;
    }

    // Validate factory address is not zero
    if (factoryAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Factory contract not deployed on this chain, send an email to victor.collasanta@gmail.com and he will add this chain");
    }

    // Check if user is factory owner - if so, create blog for free
    const currentFactoryOwner = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "factoryOwner",
    });

    const isOwner = address.toLowerCase() === (currentFactoryOwner as string).toLowerCase();

    if (isOwner) {
      // Factory owner creates blog for free
      try {
        setIsCreating(true);
        const hash = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "createBlogAsOwner",
          args: [name],
          gas: 2000000n,
        });

        console.log("Transaction hash:", hash);
        
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash,
          timeout: 120000,
          pollingInterval: 2000,
        });
        
        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        // Extract blog address from BlogCreated event
        const blogCreatedEvent = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "BlogCreated";
          } catch {
            return false;
          }
        });

        if (blogCreatedEvent) {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: blogCreatedEvent.data,
            topics: blogCreatedEvent.topics,
          });
          const blogAddress = (decoded.args as any).blogAddress;
          console.log("Blog created at address:", blogAddress);
          
          // Invalidate relevant queries after successful blog creation
          queryClient.invalidateQueries({ queryKey: ["userBlogs"] });
          queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });
          
          return { blogAddress: blogAddress as string, txHash: hash };
        }

        console.warn("Could not find BlogCreated event in receipt");
        return null;
      } catch (error) {
        console.error("Failed to create blog as owner:", error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    }

    // Regular users need to pay USDC
    if (!usdcAddress) {
      console.error("USDC address not available");
      return null;
    }

    const fee = setupFee || parseUnits("10", USDC_DECIMALS[chainId] || 6);
    
    // If fee is 0, skip balance check and approval
    if (fee === 0n) {
      try {
        setIsCreating(true);
        const hash = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "createBlog",
          args: [name],
          gas: 2000000n,
        });

        console.log("Transaction hash:", hash);
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status !== "success") {
          throw new Error("Transaction failed");
        }

        const blogCreatedEvent = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "BlogCreated";
          } catch {
            return false;
          }
        });

        if (blogCreatedEvent) {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: blogCreatedEvent.data,
            topics: blogCreatedEvent.topics,
          });
          const blogAddress = (decoded.args as any).blogAddress;
          console.log("Blog created at address:", blogAddress);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["userBlogs"] });
          
          return { blogAddress: blogAddress as string, txHash: hash };
        }

        console.warn("Could not find BlogCreated event in receipt");
        return null;
      } catch (error) {
        console.error("Failed to create blog:", error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    }
    
    // Check USDC balance first (only if fee > 0)
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    if (balance < fee) {
      throw new Error(`Insufficient USDC balance. You need ${formatUnits(fee, USDC_DECIMALS[chainId] || 6)} USDC but only have ${formatUnits(balance, USDC_DECIMALS[chainId] || 6)} USDC`);
    }

    try {
      // Step 1: Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, factoryAddress],
      });

      // Step 2: Approve if needed (only if fee > 0)
      if (fee > 0n && (!currentAllowance || currentAllowance < fee)) {
        setIsApproving(true);
        try {
          const approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [factoryAddress, fee],
          });
          
          // Wait for approval transaction to be mined
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
          
          if (receipt.status !== "success") {
            throw new Error("Approval transaction failed");
          }
          
          // Invalidate allowance query after approval
          queryClient.invalidateQueries({ queryKey: ["allowance"] });
          
          setIsApproving(false);
          
          // Small delay to ensure allowance is updated on-chain
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          setIsApproving(false);
          throw new Error(`Failed to approve USDC: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      // Step 3: Create blog
      setIsCreating(true);
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "createBlog",
        args: [name],
        gas: 2000000n,
      });

      console.log("Transaction hash:", hash);
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status !== "success") {
        throw new Error("Transaction failed");
      }

      // Extract blog address from BlogCreated event
      const blogCreatedEvent = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "BlogCreated";
        } catch {
          return false;
        }
      });

      if (blogCreatedEvent) {
        const decoded = decodeEventLog({
          abi: FACTORY_ABI,
          data: blogCreatedEvent.data,
          topics: blogCreatedEvent.topics,
        });
          const blogAddress = (decoded.args as any).blogAddress;
          console.log("Blog created at address:", blogAddress);
          
          // Invalidate relevant queries after successful blog creation
          queryClient.invalidateQueries({ queryKey: ["userBlogs"] });
          queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });
          
          return { blogAddress: blogAddress as string, txHash: hash };
      }

      console.warn("Could not find BlogCreated event in receipt");
      return null;
    } catch (error) {
      console.error("Failed to create blog with stablecoin:", error);
      throw error;
    } finally {
      setIsCreating(false);
      setIsApproving(false);
    }
  };

  const hasEnoughNativeBalance = nativeBalance && estimatedGasCost 
    ? nativeBalance.value >= estimatedGasCost 
    : true;

  return {
    factoryAddress,
    usdcAddress,
    setupFee: setupFee as bigint | undefined,
    totalBlogs: totalBlogs ? Number(totalBlogs) : undefined,
    allowance: allowance as bigint | undefined,
    usdcBalance: usdcBalance as bigint | undefined,
    nativeBalance: nativeBalance?.value,
    estimatedGas,
    estimatedGasCost,
    isEstimatingGas,
    hasEnoughNativeBalance,
    needsApproval: setupFee && setupFee > 0n && allowance ? allowance < setupFee : false,
    hasEnoughBalance: setupFee && setupFee > 0n && usdcBalance ? usdcBalance >= setupFee : true,
    isFactoryOwner: isFactoryOwner || false,
    isLoadingFee,
    isLoadingTotal,
    createBlog,
    isCreating,
    isApproving,
  };
}

