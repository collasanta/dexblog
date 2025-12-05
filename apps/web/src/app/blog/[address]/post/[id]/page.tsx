"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { usePost } from "@/hooks/usePosts";
import { useBlog } from "@/hooks/useBlog";
import { EditPostForm } from "@/components/EditPostForm";
import { formatDate, truncateAddress } from "@/lib/utils";
import { Loader2, ArrowLeft, Clock, User, ExternalLink, Edit2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { useAccount, useChainId } from "wagmi";
import { useRouter } from "next/navigation";
import { getChainById } from "@/lib/chains";

interface PostPageProps {
  params: { address: string; id: string };
}

export default function PostPage({ params }: PostPageProps) {
  const { address, id } = params;
  const blogAddress = address as `0x${string}`;
  const postId = parseInt(id);
  const router = useRouter();
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();
  const [isEditing, setIsEditing] = useState(false);

  const { info, deletePost, isDeleting } = useBlog(blogAddress);
  const { post, isLoading, refetch } = usePost(blogAddress, postId);

  const isOwner = info && connectedAddress && info.owner.toLowerCase() === connectedAddress.toLowerCase();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    const success = await deletePost(postId);
    if (success) {
      router.push(`/blog/${address}`);
    }
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    refetch();
  };

  return (
    <main className="min-h-screen gradient-bg">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 max-w-3xl">
        <Link href={`/blog/${address}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to {info?.name || "Blog"}
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !post ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
            <p className="text-muted-foreground">
              This post doesn&apos;t exist.
            </p>
          </div>
        ) : isEditing ? (
          <EditPostForm
            blogAddress={blogAddress}
            postId={postId}
            initialTitle={post.title}
            initialBody={post.body}
            onCancel={() => setIsEditing(false)}
            onSuccess={handleEditSuccess}
          />
        ) : (
          <article>
            <header className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex-1 break-words">
                  {post.title}
                </h1>
                {isOwner && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">{formatDate(post.timestamp)}</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all">{truncateAddress(post.author)}</span>
                  </div>
                  {post.transactionHash ? (
                    <a
                      href={`${getChainById(chainId)?.blockExplorers?.default.url}/tx/${post.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors break-all"
                    >
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline text-muted-foreground">Blockchain Record:</span>
                      <span className="sm:hidden text-muted-foreground">Record:</span>
                      <span className="break-all">{truncateAddress(post.transactionHash, 6)}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground/50">
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline text-muted-foreground/50">Blockchain Record:</span>
                      <span className="sm:hidden text-muted-foreground/50">Record:</span>
                      <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </header>

            <GlassCard className="p-4 sm:p-6 md:p-8">
              <div className="prose-dark prose prose-sm sm:prose-base md:prose-lg max-w-none break-words overflow-wrap-anywhere">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {post.body}
                </ReactMarkdown>
              </div>
            </GlassCard>
          </article>
        )}
      </div>
    </main>
  );
}

