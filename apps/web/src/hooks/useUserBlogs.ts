"use client";

import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { getFactoryAddress } from "@/lib/contracts";
import { DexBlogFactory, DexBlog } from "dex-blog-sdk";
import { useSdkProvider } from "./useSdkProvider";

export interface UserBlog {
  address: string;
  name: string;
  postCount: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useUserBlogs() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { provider: sdkProvider } = useSdkProvider(chainId);
  const factoryAddress = getFactoryAddress(chainId);

  const factory = useMemo(() => {
    if (!sdkProvider || !factoryAddress) return null;
    return new DexBlogFactory({
      address: factoryAddress as `0x${string}`,
      chainId,
      provider: sdkProvider,
    });
  }, [sdkProvider, factoryAddress, chainId]);

  const { data: blogAddresses, isLoading: isLoadingAddresses, error: addressesError } = useQuery({
    queryKey: ["userBlogs-addresses", userAddress, chainId],
    queryFn: async (): Promise<string[]> => {
      if (!factory || !userAddress) return [];
      try {
        // SDK's ResilientProvider handles retries automatically
        const addresses = await factory.getBlogsByOwner(userAddress);
        return addresses;
      } catch (error: any) {
        throw error;
      }
    },
    enabled: !!factory && !!userAddress,
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: blogs, isLoading: isLoadingBlogs } = useQuery({
    queryKey: ["userBlogs", userAddress, chainId, blogAddresses?.join(",")],
    queryFn: async (): Promise<UserBlog[]> => {
      if (!blogAddresses || !sdkProvider) return [];

      const results: UserBlog[] = [];
      for (const addr of blogAddresses) {
        try {
          const blog = new DexBlog({
            address: addr as `0x${string}`,
            chainId,
            provider: sdkProvider,
          });
          
          // SDK's ResilientProvider handles retries automatically
          const info = await blog.getInfo();
          results.push({
            address: info.address,
            name: info.name,
            postCount: info.postCount,
          });
        } catch (error: any) {
          // Check if it's a "contract doesn't exist" error (non-retryable)
          const isContractMissing =
            error?.message?.includes("missing revert data") ||
            error?.message?.includes("call revert exception") ||
            error?.code === "CALL_EXCEPTION";

          const isBadDataEmpty =
            error?.code === "BAD_DATA" &&
            (error?.message?.includes('value="0x"') ||
              error?.message?.includes("value=0x") ||
              error?.info?.value === "0x" ||
              error?.info?.value === "0x0");

          if (isContractMissing || isBadDataEmpty) {
            // Not a valid blog contract at this address - skip silently
            continue;
          }

          // Log other errors but don't fail the whole query
          console.warn(`Failed to fetch blog ${addr}:`, error?.message || error);
        }
        // Small delay between blogs to be nice to RPCs
        await delay(100);
      }

      return results;
    },
    enabled: !!sdkProvider && !!blogAddresses && blogAddresses.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isReady = !!sdkProvider && !!factory && !!userAddress;
  const isLoading = !isReady || isLoadingAddresses || isLoadingBlogs;

  return {
    blogs: blogs || [],
    isLoading,
    blogCount: blogAddresses ? blogAddresses.length : 0,
  };
}



