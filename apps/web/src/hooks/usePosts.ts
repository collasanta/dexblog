"use client";

import { useMemo } from "react";
import { useBlog, Post } from "./useBlog";

export function usePosts(
  address: `0x${string}` | undefined,
  page: number = 0,
  perPage: number = 10
) {
  const { posts, isLoadingPosts, refetchPosts } = useBlog(address);

  const paginatedPosts = useMemo(() => {
    // Sort by timestamp descending (newest first)
    const sorted = [...posts].sort((a, b) => b.timestamp - a.timestamp);
    const start = page * perPage;
    return sorted.slice(start, start + perPage);
  }, [posts, page, perPage]);

  const totalPages = Math.ceil(posts.length / perPage);
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return {
    posts: paginatedPosts,
    allPosts: posts,
    isLoading: isLoadingPosts,
    totalPages,
    currentPage: page,
    hasNextPage,
    hasPrevPage,
    totalPosts: posts.length,
    refetch: refetchPosts,
  };
}

export function usePost(address: `0x${string}` | undefined, postId: number) {
  const { posts, isLoadingPosts, refetchPosts } = useBlog(address);

  const post = useMemo(() => {
    return posts.find((p) => p.id === postId) || null;
  }, [posts, postId]);

  return {
    post,
    isLoading: isLoadingPosts,
    refetch: refetchPosts,
  };
}

