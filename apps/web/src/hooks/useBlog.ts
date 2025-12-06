"use client";

import { useChainId } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DexBlog } from "dex-blog-sdk";
import { useSdkProvider } from "./useSdkProvider";
import { useSdkSigner } from "./useSdkSigner";

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { provider: sdkProvider } = useSdkProvider(chainId);
  const { signer, chainId: signerChainId } = useSdkSigner();
  const canUseSigner = signer && signerChainId === chainId;

  const readBlog = useMemo(() => {
    if (!address || !chainId || !sdkProvider) {
      return null;
    }
    return new DexBlog({
      address,
      chainId,
      provider: sdkProvider,
    });
  }, [address, chainId, sdkProvider]);

  const getWriteBlog = () => {
    if (!readBlog || !sdkProvider || !canUseSigner || !signer) {
      return null;
    }
    return new DexBlog({
      address: address!,
      chainId,
      provider: sdkProvider,
      signer,
    });
  };

  const { data: info, isLoading: isLoadingInfo } = useQuery({
    queryKey: ["blog-info", address, chainId],
    enabled: !!readBlog,
    queryFn: async (): Promise<BlogInfo | undefined> => {
      if (!readBlog) return undefined;
      return readBlog.getInfo();
    },
    staleTime: 60 * 1000,
  });

  // Fetch posts from contract storage (FAST - no hashes, ~300ms)
  const { data: postsWithoutHashes, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["posts-basic", address, chainId],
    enabled: !!readBlog,
    queryFn: async (): Promise<Post[]> => {
      if (!readBlog) {
        return [];
      }

      try {
        // Fast: Get posts WITHOUT fetching hashes (~300ms)
        const sdkPosts = await readBlog.getPostsWithoutHashes({});
        
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
    enabled: !!readBlog && !!postsWithoutHashes && postsWithoutHashes.length > 0,
    queryFn: async (): Promise<Map<number, string>> => {
      if (!readBlog || !postsWithoutHashes) {
        return new Map();
      }

      try {
        // Fast: Batch fetch hashes (3 concurrent, respects dRPC limits)
        const postsWithBlockNumbers = postsWithoutHashes
          .filter(p => p.blockNumber && p.blockNumber > 0)
          .map(p => ({ postId: p.id, blockNumber: p.blockNumber! }));
        
        const hashMap = await readBlog.getPostHashesBatch(postsWithBlockNumbers);
        
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
    const blogWithSigner = getWriteBlog();
    if (!blogWithSigner) {
      console.error("Signer not available for publish");
      return { success: false };
    }

    setIsPublishing(true);
    try {
      const result = await blogWithSigner.publish(title, body);
      await refetchPostsAndHashes();
      return { success: true, postId: result.postId };
    } catch (error) {
      console.error("Failed to publish:", error);
      return { success: false };
    } finally {
      setIsPublishing(false);
    }
  };

  const editPost = async (id: number, newTitle: string, newBody: string): Promise<boolean> => {
    const blogWithSigner = getWriteBlog();
    if (!blogWithSigner) {
      console.error("Signer not available for edit");
      return false;
    }

    setIsEditing(true);
    try {
      await blogWithSigner.editPost(id, newTitle, newBody);
      await refetchPostsAndHashes();
      return true;
    } catch (error) {
      console.error("Failed to edit post:", error);
      return false;
    } finally {
      setIsEditing(false);
    }
  };

  const deletePost = async (id: number): Promise<boolean> => {
    const blogWithSigner = getWriteBlog();
    if (!blogWithSigner) {
      console.error("Signer not available for delete");
      return false;
    }

    setIsDeleting(true);
    try {
      await blogWithSigner.deletePost(id);
      await refetchPostsAndHashes();
      return true;
    } catch (error) {
      console.error("Failed to delete post:", error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    info,
    posts: posts || [],
    isLoadingPosts,
    isLoadingInfo,
    isLoadingHashes,
    hasReadBlog: !!readBlog,
    publish,
    isPublishing,
    editPost,
    isEditing,
    deletePost,
    isDeleting,
    refetchPosts: refetchPostsAndHashes,
  };
}

