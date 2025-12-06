"use client";

import { useAccount, useChainId, useReadContract, usePublicClient } from "wagmi";
import { getFactoryAddress, FACTORY_ABI, BLOG_ABI } from "@/lib/contracts";
import { useQuery } from "@tanstack/react-query";

export interface UserBlog {
  address: string;
  name: string;
  postCount: number;
}

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useUserBlogs() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const factoryAddress = getFactoryAddress(chainId);
  const publicClient = usePublicClient();

  const { data: blogAddresses, isLoading: isLoadingAddresses } = useReadContract({
    address: factoryAddress || undefined,
    abi: FACTORY_ABI,
    functionName: "getBlogsByOwner",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!factoryAddress && !!userAddress,
    },
  });

  // Fetch blog details for each address sequentially to avoid rate limits
  const { data: blogs, isLoading: isLoadingBlogs } = useQuery({
    queryKey: ["userBlogs", userAddress, chainId, blogAddresses],
    queryFn: async (): Promise<UserBlog[]> => {
      if (!blogAddresses || !chainId || !publicClient) return [];

      const blogDetails: UserBlog[] = [];
      
      // Fetch blogs sequentially with delay to avoid rate limits
      for (const addr of blogAddresses as string[]) {
        try {
          const [name, postCount] = await Promise.all([
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: BLOG_ABI,
              functionName: "name",
            }),
            publicClient.readContract({
              address: addr as `0x${string}`,
              abi: BLOG_ABI,
              functionName: "postCount",
            }),
          ]);

          blogDetails.push({
            address: addr,
            name: name as string,
            postCount: Number(postCount),
          });
        } catch (error) {
          console.error(`Failed to fetch blog ${addr}:`, error);
        }
        
        // Add delay between blogs to avoid rate limiting
        await delay(150);
      }

      return blogDetails;
    },
    enabled: !!blogAddresses && (blogAddresses as string[]).length > 0 && !!publicClient,
    staleTime: 5 * 60 * 1000, // 5 minutes - blog metadata rarely changes
  });

  return {
    blogs: blogs || [],
    isLoading: isLoadingAddresses || isLoadingBlogs,
    blogCount: blogAddresses ? (blogAddresses as string[]).length : 0,
  };
}



