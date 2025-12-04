"use client";

import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { BLOG_ABI } from "@/lib/contracts";
import { useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, polygon, arbitrum, optimism, mainnet, bsc } from "viem/chains";

const chains = { 1: mainnet, 137: polygon, 42161: arbitrum, 10: optimism, 8453: base, 56: bsc };

export interface Post {
  id: number;
  author: string;
  title: string;
  body: string;
  timestamp: number;
  transactionHash: string;
}

export interface BlogInfo {
  address: string;
  owner: string;
  name: string;
  postCount: number;
}

export function useBlog(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: owner } = useReadContract({
    address,
    abi: BLOG_ABI,
    functionName: "owner",
    query: { enabled: !!address },
  });

  const { data: name } = useReadContract({
    address,
    abi: BLOG_ABI,
    functionName: "name",
    query: { enabled: !!address },
  });

  const { data: postCount } = useReadContract({
    address,
    abi: BLOG_ABI,
    functionName: "postCount",
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  // Fetch posts from events
  const { data: posts, isLoading: isLoadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ["posts", address, chainId],
    queryFn: async (): Promise<Post[]> => {
      if (!address || !chainId) return [];

      const chain = chains[chainId as keyof typeof chains];
      if (!chain) return [];

      const client = createPublicClient({
        chain,
        transport: http(),
      });

      try {
        const logs = await client.getLogs({
          address,
          event: parseAbiItem(
            "event PostCreated(uint256 indexed id, address indexed author, string title, string body, uint256 timestamp)"
          ),
          fromBlock: "earliest",
          toBlock: "latest",
        });

        return logs.map((log) => ({
          id: Number(log.args.id),
          author: log.args.author as string,
          title: log.args.title as string,
          body: log.args.body as string,
          timestamp: Number(log.args.timestamp),
          transactionHash: log.transactionHash,
        }));
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        return [];
      }
    },
    enabled: !!address && !!chainId,
  });

  const publish = async (title: string, body: string): Promise<boolean> => {
    if (!address) return false;

    setIsPublishing(true);
    try {
      await writeContractAsync({
        address,
        abi: BLOG_ABI,
        functionName: "publish",
        args: [title, body],
      });

      // Refetch posts after publishing
      await refetchPosts();
      return true;
    } catch (error) {
      console.error("Failed to publish:", error);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const info: BlogInfo | undefined =
    address && owner && name && postCount !== undefined
      ? {
          address,
          owner: owner as string,
          name: name as string,
          postCount: Number(postCount),
        }
      : undefined;

  return {
    info,
    posts: posts || [],
    isLoadingPosts,
    publish,
    isPublishing,
    refetchPosts,
  };
}

