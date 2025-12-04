"use client";

import { use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { usePost } from "@/hooks/usePosts";
import { useBlog } from "@/hooks/useBlog";
import { formatDate, truncateAddress } from "@/lib/utils";
import { Loader2, ArrowLeft, Clock, User, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface PostPageProps {
  params: Promise<{ address: string; id: string }>;
}

export default function PostPage({ params }: PostPageProps) {
  const { address, id } = use(params);
  const blogAddress = address as `0x${string}`;
  const postId = parseInt(id);

  const { info } = useBlog(blogAddress);
  const { post, isLoading } = usePost(blogAddress, postId);

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
        ) : (
          <article>
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(post.timestamp)}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {truncateAddress(post.author)}
                </div>
                <a
                  href={`https://basescan.org/tx/${post.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </a>
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

