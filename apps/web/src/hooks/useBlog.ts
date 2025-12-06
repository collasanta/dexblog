"use client";

import { useReadContract, useWriteContract, useChainId, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  blockNumber?: number;
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
  const queryClient = useQueryClient();

  // Fetch posts from contract storage (FAST - no hashes, ~300ms)
  const { data: postsWithoutHashes, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["posts-basic", address, chainId],
    enabled: !!address && !!publicClient && !!chainId,
    queryFn: async (): Promise<Post[]> => {
      if (!address || !publicClient || !chainId) {
        return [];
      }

      try {
        // Get RPC URL from publicClient's transport
        const DRPC_URLS: Record<number, string> = {
          1: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.drpc.org",
          137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.drpc.org",
          42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arbitrum.drpc.org",
          421614: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia.drpc.org",
          10: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://optimism.drpc.org",
          8453: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
          56: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc.drpc.org",
        };

        const rpcUrl = DRPC_URLS[chainId];
        if (!rpcUrl) {
          return [];
        }

        const provider = new JsonRpcProvider(rpcUrl, chainId);
        const blog = new DexBlog({
          address,
          chainId,
          provider,
        });

        // Fast: Get posts WITHOUT fetching hashes (~300ms)
        const sdkPosts = await blog.getPostsWithoutHashes({});
        
        return sdkPosts.map((post: Post) => ({
          id: post.id,
          author: post.author,
          title: post.title,
          body: post.body,
          timestamp: post.timestamp,
          blockNumber: post.blockNumber,
          transactionHash: "", // Will be filled by separate query
          deleted: post.deleted,
        }));
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        return [];
      }
    },
    refetchInterval: 60000, // Reduced from 10s to 60s
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch transaction hashes in background with batching (non-blocking, progressive)
  const { data: transactionHashes } = useQuery({
    queryKey: ["post-hashes", address, chainId, postsWithoutHashes?.map(p => `${p.id}-${p.blockNumber}`).join(",")],
    enabled: !!address && !!publicClient && !!chainId && !!postsWithoutHashes && postsWithoutHashes.length > 0,
    queryFn: async (): Promise<Map<number, string>> => {
      if (!address || !publicClient || !chainId || !postsWithoutHashes) {
        return new Map();
      }

      try {
        const DRPC_URLS: Record<number, string> = {
          1: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.drpc.org",
          137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.drpc.org",
          42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arbitrum.drpc.org",
          421614: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia.drpc.org",
          10: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://optimism.drpc.org",
          8453: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
          56: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc.drpc.org",
        };

        const rpcUrl = DRPC_URLS[chainId];
        if (!rpcUrl) {
          return new Map();
        }

        const provider = new JsonRpcProvider(rpcUrl, chainId);
        const blog = new DexBlog({
          address,
          chainId,
          provider,
        });

        // Fast: Batch fetch hashes (3 concurrent, respects dRPC limits)
        const postsWithBlockNumbers = postsWithoutHashes
          .filter(p => p.blockNumber && p.blockNumber > 0)
          .map(p => ({ postId: p.id, blockNumber: p.blockNumber! }));
        
        const hashMap = await blog.getPostHashesBatch(postsWithBlockNumbers);
        
        return hashMap;
      } catch (error) {
        console.error("Failed to fetch transaction hashes:", error);
        return new Map();
      }
    },
    refetchInterval: 60000, // Match posts refetch interval
    staleTime: 30 * 1000,
  });

  // Merge posts with transaction hashes
  const posts: Post[] = (postsWithoutHashes || []).map((post) => ({
    ...post,
    transactionHash: transactionHashes?.get(post.id) || post.transactionHash || "",
  }));

  const isLoadingHashes = !!postsWithoutHashes && postsWithoutHashes.length > 0 && !transactionHashes;

  const refetchPostsAndHashes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["posts-basic", address, chainId] }),
      queryClient.invalidateQueries({ queryKey: ["post-hashes", address, chainId] }),
    ]);
  };

  const publish = async (title: string, body: string): Promise<{ success: boolean; postId?: number }> => {
    if (!address || !publicClient) return { success: false };

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
        // Extract postId from PostCreated event
        let postId: number | undefined;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: BLOG_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "PostCreated" && decoded.args.id !== undefined) {
              postId = Number(decoded.args.id);
              break;
            }
          } catch (e) {
            // Not a PostCreated event, continue
          }
        }
        
        // Refetch posts after transaction is confirmed
        await refetchPostsAndHashes();
        return { success: true, postId };
      } else {
        console.error("Transaction failed");
        return { success: false };
      }
    } catch (error) {
      console.error("Failed to publish:", error);
      return { success: false };
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
        await refetchPostsAndHashes();
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
        await refetchPostsAndHashes();
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
    isLoadingHashes,
    publish,
    isPublishing,
    editPost,
    isEditing,
    deletePost,
    isDeleting,
    refetchPosts: refetchPostsAndHashes,
  };
}

