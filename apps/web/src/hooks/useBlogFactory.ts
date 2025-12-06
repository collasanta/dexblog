"use client";

import { useChainId, useAccount } from "wagmi";
import { useMemo, useState, useEffect } from "react";
import { parseUnits, formatUnits, getAddress } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import {
  getFactoryAddress,
  getUSDCAddress,
  USDC_DECIMALS,
  ERC20_ABI,
} from "@/lib/contracts";
import { useUSDCBalance } from "./useUSDCBalance";
import { DexBlogFactory } from "dex-blog-sdk";
import { useSdkProvider } from "./useSdkProvider";
import { useSdkSigner } from "./useSdkSigner";

export function useBlogFactory() {
  const chainId = useChainId();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const factoryAddressRaw = getFactoryAddress(chainId);
  const factoryAddress = factoryAddressRaw ? (getAddress(factoryAddressRaw) as `0x${string}`) : null;
  const usdcAddressRaw = getUSDCAddress(chainId);
  const usdcAddress = usdcAddressRaw ? (getAddress(usdcAddressRaw) as `0x${string}`) : null;
  const [isCreating, setIsCreating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [estimatedGasCost, setEstimatedGasCost] = useState<bigint | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  const { provider: sdkProvider } = useSdkProvider(chainId);
  const { signer, chainId: signerChainId } = useSdkSigner();
  const canSign = signer && signerChainId === chainId;

  const readFactory = useMemo(() => {
    if (!factoryAddress || !chainId || !sdkProvider) {
      return null;
    }
    return new DexBlogFactory({
      address: factoryAddress,
      chainId,
      provider: sdkProvider,
    });
  }, [factoryAddress, chainId, sdkProvider]);

  const getWriteFactory = () => {
    if (!readFactory || !sdkProvider || !canSign || !signer) {
      return null;
    }
    return new DexBlogFactory({
      address: factoryAddress!,
      chainId,
      provider: sdkProvider,
      signer,
    });
  };

  const { usdcBalance } = useUSDCBalance();

  const { data: setupFee, isLoading: isLoadingFee, error: setupFeeError } = useQuery({
    queryKey: ["factory-setup-fee", chainId, factoryAddress],
    enabled: !!readFactory,
    queryFn: async (): Promise<bigint> => {
      if (!readFactory) return 0n;
      try {
        console.log(`[useBlogFactory] Fetching setup fee for chain ${chainId}`);
        const fee = await readFactory.getSetupFee();
        console.log(`[useBlogFactory] Setup fee: ${fee.toString()}`);
        return fee;
      } catch (error: any) {
        console.error(`[useBlogFactory] Failed to fetch setup fee:`, error);
        throw error;
      }
    },
    staleTime: Infinity,
    retry: 2,
    retryDelay: 1000,
  });

  if (setupFeeError) {
    console.error("[useBlogFactory] Error fetching setup fee:", setupFeeError);
  }

  const { data: totalBlogs, isLoading: isLoadingTotal } = useQuery({
    queryKey: ["factory-total-blogs", chainId, factoryAddress],
    enabled: !!readFactory,
    queryFn: async (): Promise<number> => {
      if (!readFactory) return 0;
      return readFactory.totalBlogs();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: factoryOwner } = useQuery({
    queryKey: ["factory-owner", chainId, factoryAddress],
    enabled: !!readFactory,
    queryFn: async () => {
      if (!readFactory) return null;
      return readFactory.getFactoryOwner();
    },
    staleTime: Infinity,
  });

  const isFactoryOwner =
    address && factoryOwner && address.toLowerCase() === factoryOwner.toLowerCase();

  const { data: allowance, refetch: refetchAllowance } = useQuery({
    queryKey: ["usdc-allowance", usdcAddress, address, factoryAddress, chainId],
    enabled: !!sdkProvider && !!usdcAddress && !!address && !!factoryAddress,
    queryFn: async (): Promise<bigint> => {
      if (!sdkProvider || !usdcAddress || !address || !factoryAddress) {
        return 0n;
      }
      const contract = new ethers.Contract(usdcAddress, ERC20_ABI, sdkProvider);
      return contract.allowance(address, factoryAddress) as Promise<bigint>;
    },
    staleTime: 10 * 1000,
  });

  const { data: nativeBalance } = useQuery({
    queryKey: ["native-balance", address, chainId],
    enabled: !!sdkProvider && !!address,
    queryFn: async () => {
      if (!sdkProvider || !address) return null;
      const value = await sdkProvider.getBalance(address);
      return { value };
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    const estimateGasCost = async () => {
      if (!sdkProvider) {
        setEstimatedGasCost(null);
        return;
      }

      setIsEstimatingGas(true);
      try {
        const feeData = await sdkProvider.getFeeData();
        const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 1_000_000_000n;
        const estimatedGas = isFactoryOwner ? 500000n : 600000n;
        const totalCost = gasPrice * estimatedGas;
        if (!cancelled) {
          setEstimatedGasCost(totalCost);
        }
      } catch (error) {
        console.error("Failed to estimate gas cost:", error);
        if (!cancelled) {
          setEstimatedGasCost(parseUnits("0.0001", 18));
        }
      } finally {
        if (!cancelled) {
          setIsEstimatingGas(false);
        }
      }
    };

    estimateGasCost();
    return () => {
      cancelled = true;
    };
  }, [sdkProvider, isFactoryOwner]);

  const createBlog = async (name: string): Promise<{ blogAddress: string; txHash: string } | null> => {
    const factory = getWriteFactory();
    if (!factory || !factoryAddress) {
      throw new Error("Factory contract not available on this chain");
    }
    if (!address || !canSign || !signer) {
      throw new Error("Connect your wallet on the selected chain");
    }

    if (isFactoryOwner) {
      try {
        setIsCreating(true);
        const result = await factory.createBlogAsOwner(name);

        queryClient.invalidateQueries({ queryKey: ["userBlogs"] });
        queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });

        return { blogAddress: result.blogAddress, txHash: result.receipt.hash };
      } finally {
        setIsCreating(false);
      }
    }

    if (!usdcAddress) {
      throw new Error("USDC token not configured for this chain");
    }

    const decimals = USDC_DECIMALS[chainId] || 6;
    const fee = setupFee ?? parseUnits("10", decimals);
    const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);

    if (fee > 0n) {
      const balance = await usdcContract.balanceOf(address);
      if (balance < fee) {
        throw new Error(
          `Insufficient USDC balance. You need ${formatUnits(fee, decimals)} USDC but only have ${formatUnits(balance, decimals)} USDC`
        );
      }

      const currentAllowance =
        allowance !== undefined ? allowance : await usdcContract.allowance(address, factoryAddress);

      if (currentAllowance < fee) {
        setIsApproving(true);
        try {
          const approveTx = await usdcContract.approve(factoryAddress, fee);
          await approveTx.wait();
          await refetchAllowance();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } finally {
          setIsApproving(false);
        }
      }
    }

    try {
      setIsCreating(true);
      const result = await factory.createBlog(name);

      queryClient.invalidateQueries({ queryKey: ["userBlogs"] });
      queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });

      return { blogAddress: result.blogAddress, txHash: result.receipt.hash };
    } finally {
      setIsCreating(false);
    }
  };

  const hasEnoughNativeBalance =
    nativeBalance && estimatedGasCost ? nativeBalance.value >= estimatedGasCost : true;
  const needsApproval = setupFee && allowance !== undefined && allowance < setupFee && setupFee > 0n;

  return {
    setupFee,
    usdcAddress,
    factoryAddress,
    usdcBalance,
    isFactoryOwner,
    createBlog,
    isCreating,
    isApproving,
    isLoadingFee,
    isLoadingTotal,
    totalBlogs,
    allowance,
    needsApproval,
    estimatedGasCost,
    isEstimatingGas,
    hasEnoughNativeBalance,
  };
}

