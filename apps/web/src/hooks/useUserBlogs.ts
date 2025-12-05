"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { getFactoryAddress, FACTORY_ABI, BLOG_ABI } from "@/lib/contracts";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { base, polygon, arbitrum, optimism, mainnet, bsc } from "viem/chains";

const chains = { 1: mainnet, 137: polygon, 42161: arbitrum, 10: optimism, 8453: base, 56: bsc };

export interface UserBlog {
  address: string;
  name: string;
  postCount: number;
}

export function useUserBlogs() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const factoryAddress = getFactoryAddress(chainId);

  const { data: blogAddresses, isLoading: isLoadingAddresses } = useReadContract({
    address: factoryAddress || undefined,
    abi: FACTORY_ABI,
    functionName: "getBlogsByOwner",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!factoryAddress && !!userAddress,
    },
  });

  // Fetch blog details for each address
  const { data: blogs, isLoading: isLoadingBlogs } = useQuery({
    queryKey: ["userBlogs", userAddress, chainId, blogAddresses],
    queryFn: async (): Promise<UserBlog[]> => {
      if (!blogAddresses || !chainId) return [];

      const chain = chains[chainId as keyof typeof chains];
      if (!chain) return [];

      const client = createPublicClient({
        chain,
        transport: http(),
      });

      const blogDetails = await Promise.all(
        (blogAddresses as string[]).map(async (addr) => {
          try {
            const [name, postCount] = await Promise.all([
              client.readContract({
                address: addr as `0x${string}`,
                abi: BLOG_ABI,
                functionName: "name",
              }),
              client.readContract({
                address: addr as `0x${string}`,
                abi: BLOG_ABI,
                functionName: "postCount",
              }),
            ]);

            return {
              address: addr,
              name: name as string,
              postCount: Number(postCount),
            };
          } catch (error) {
            console.error(`Failed to fetch blog ${addr}:`, error);
            return null;
          }
        })
      );

      return blogDetails.filter((b): b is UserBlog => b !== null);
    },
    enabled: !!blogAddresses && (blogAddresses as string[]).length > 0,
  });

  return {
    blogs: blogs || [],
    isLoading: isLoadingAddresses || isLoadingBlogs,
    blogCount: blogAddresses ? (blogAddresses as string[]).length : 0,
  };
}


