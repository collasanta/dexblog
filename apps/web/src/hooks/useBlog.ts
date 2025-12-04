"use client";

import { useReadContract, useWriteContract, useChainId, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { BLOG_ABI } from "@/lib/contracts";
import { useState } from "react";
import { DexBlog } from "dex-blog-sdk";
import { JsonRpcProvider } from "ethers";

export interface Post {
  id: number;
  author: string;
  title: string;
  body: string;
  timestamp: number;
  transactionHash: string;
  deleted: boolean;
}

export interface BlogInfo {
  address: string;
  owner: string;
  name: string;
  postCount: number;
}

export function useBlog(address: `0x${string}` | undefined) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch posts from events using SDK
  const { data: posts, isLoading: isLoadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ["posts", address, chainId],
    queryFn: async (): Promise<Post[]> => {
      if (!address || !publicClient || !chainId) {
        console.log("Missing address, publicClient, or chainId:", { address, publicClient: !!publicClient, chainId });
        return [];
      }

      console.log("Fetching posts for blog using SDK:", address);

      try {
        // Use DRPC URLs directly (same as wagmi config)
        const DRPC_URLS: Record<number, string> = {
          1: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.drpc.org",
          137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.drpc.org",
          42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arbitrum.drpc.org",
          10: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://optimism.drpc.org",
          8453: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://base.drpc.org",
          56: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc.drpc.org",
        };

        const rpcUrl = DRPC_URLS[chainId];
        if (!rpcUrl) {
          console.error("RPC URL not found for chain:", chainId);
          return [];
        }

        console.log("Using SDK with RPC URL:", rpcUrl);

        // Create ethers JsonRpcProvider
        const provider = new JsonRpcProvider(rpcUrl, chainId);

        // Create SDK instance
        const blog = new DexBlog({
          address,
          chainId,
          provider,
        });

        // Use SDK's getPosts method which reads from contract storage
        const sdkPosts = await blog.getPosts();
        
        console.log(`SDK found ${sdkPosts.length} posts`);
        if (sdkPosts.length > 0) {
          console.log("First post:", sdkPosts[0]);
        }

        // Convert SDK Post format to our Post format
        const mappedPosts = sdkPosts.map((post) => ({
          id: post.id,
          author: post.author,
          title: post.title,
          body: post.body,
          timestamp: post.timestamp,
          transactionHash: post.transactionHash,
          deleted: post.deleted,
        }));
        
        console.log("Mapped posts:", mappedPosts);
        return mappedPosts;
      } catch (error) {
        console.error("Failed to fetch posts using SDK:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        return [];
      }
    },
    enabled: !!address && !!publicClient && !!chainId,
    refetchInterval: 10000, // Refetch every 10 seconds to catch new posts
  });

  const publish = async (title: string, body: string): Promise<boolean> => {
    if (!address || !publicClient) return false;

    setIsPublishing(true);
    try {
      const hash = await writeContractAsync({
        address,
        abi: BLOG_ABI,
        functionName: "publish",
        args: [title, body],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === "success") {
        // Refetch posts after transaction is confirmed
        await refetchPosts();
        return true;
      } else {
        console.error("Transaction failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to publish:", error);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const editPost = async (id: number, newTitle: string, newBody: string): Promise<boolean> => {
    if (!address || !publicClient) return false;

    setIsEditing(true);
    try {
      const hash = await writeContractAsync({
        address,
        abi: BLOG_ABI as any,
        functionName: "editPost",
        args: [BigInt(id), newTitle, newBody],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === "success") {
        // Refetch posts after transaction is confirmed
        await refetchPosts();
        return true;
      } else {
        console.error("Transaction failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to edit post:", error);
      return false;
    } finally {
      setIsEditing(false);
    }
  };

  const deletePost = async (id: number): Promise<boolean> => {
    if (!address || !publicClient) return false;

    setIsDeleting(true);
    try {
      const hash = await writeContractAsync({
        address,
        abi: BLOG_ABI as any,
        functionName: "deletePost",
        args: [BigInt(id)],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === "success") {
        // Refetch posts after transaction is confirmed
        await refetchPosts();
        return true;
      } else {
        console.error("Transaction failed");
        return false;
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      return false;
    } finally {
      setIsDeleting(false);
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
    editPost,
    isEditing,
    deletePost,
    isDeleting,
    refetchPosts,
  };
}

