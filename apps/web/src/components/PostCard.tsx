import Link from "next/link";
import { GlassCard } from "@/components/ui/card";
import { formatDate, truncateAddress } from "@/lib/utils";
import { Post } from "@/hooks/useBlog";
import { Clock, User, ExternalLink } from "lucide-react";

interface PostCardProps {
  post: Post;
  blogAddress: string;
}

export function PostCard({ post, blogAddress }: PostCardProps) {
  // Get first 200 chars of body for preview
  const preview =
    post.body.length > 200 ? post.body.slice(0, 200) + "..." : post.body;

  return (
    <Link href={`/blog/${blogAddress}/post/${post.id}`}>
      <GlassCard className="p-6 hover:shadow-glow-sm hover:border-primary/30 transition-all duration-300 cursor-pointer">
        <h3 className="text-xl font-semibold mb-3 line-clamp-2 hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {preview}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(post.timestamp)}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {truncateAddress(post.author)}
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
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} blogAddress={blogAddress} />
      ))}
    </div>
  );
}

