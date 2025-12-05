"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/card";
import { formatDate, truncateAddress } from "@/lib/utils";
import { Post } from "@/hooks/useBlog";
import { Clock, User, ExternalLink } from "lucide-react";
import { useChainId } from "wagmi";
import { getChainById } from "@/lib/chains";

interface PostCardProps {
  post: Post;
  blogAddress: string;
}

export function PostCard({ post, blogAddress }: PostCardProps) {
  const chainId = useChainId();
  const chain = getChainById(chainId);
  
  // Get first 200 chars of body for preview
  const preview =
    post.body.length > 200 ? post.body.slice(0, 200) + "..." : post.body;

  const handleTxHashClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (post.transactionHash && chain?.blockExplorers?.default.url) {
      window.open(`${chain.blockExplorers.default.url}/tx/${post.transactionHash}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Link href={`/blog/${blogAddress}/post/${post.id}`} className="block">
      <GlassCard className="p-6 hover:shadow-glow-sm hover:border-primary/30 transition-all duration-300 cursor-pointer">
        <h3 className="text-xl font-semibold mb-3 line-clamp-2 hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {preview}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="break-words">{formatDate(post.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="break-all">{truncateAddress(post.author)}</span>
            </div>
            {post.transactionHash ? (
              <button
                type="button"
                onClick={handleTxHashClick}
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors break-all text-left"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline text-muted-foreground">Blockchain Record:</span>
                <span className="sm:hidden text-muted-foreground">Record:</span>
                <span className="break-all">{truncateAddress(post.transactionHash, 4)}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground/50">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline text-muted-foreground/50">Blockchain Record:</span>
                <span className="sm:hidden text-muted-foreground/50">Record:</span>
                <div className="h-3 w-12 bg-muted/50 rounded animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

interface PostListProps {
  posts: Post[];
  blogAddress: string;
}

export function PostList({ posts, blogAddress }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} blogAddress={blogAddress} />
      ))}
    </div>
  );
}

