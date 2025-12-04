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
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

interface PostPageProps {
  params: { address: string; id: string };
}

export default function PostPage({ params }: PostPageProps) {
  const { address, id } = params;
  const blogAddress = address as `0x${string}`;
  const postId = parseInt(id);
  const router = useRouter();
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

      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
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
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl md:text-4xl font-bold flex-1">
                  {post.title}
                </h1>
                {isOwner && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
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
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(post.timestamp)}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {truncateAddress(post.author)}
                </div>
                {post.transactionHash && (
                  <a
                    href={`https://arbiscan.io/tx/${post.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on Explorer
                  </a>
                )}
              </div>
            </header>

            <GlassCard className="p-8">
              <div className="prose-dark prose prose-lg max-w-none">
                <ReactMarkdown>{post.body}</ReactMarkdown>
              </div>
            </GlassCard>
          </article>
        )}
      </div>
    </main>
  );
}

