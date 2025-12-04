"use client";

import { use, useState } from "react";
import { Header } from "@/components/Header";
import { BlogHeader } from "@/components/BlogHeader";
import { PostList } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { useBlog } from "@/hooks/useBlog";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface BlogPageProps {
  params: Promise<{ address: string }>;
}

export default function BlogPage({ params }: BlogPageProps) {
  const { address } = use(params);
  const blogAddress = address as `0x${string}`;
  const { info, posts, isLoadingPosts } = useBlog(blogAddress);
  const [page, setPage] = useState(0);
  const perPage = 10;

  // Paginate posts
  const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);
  const paginatedPosts = sortedPosts.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(posts.length / perPage);

  return (
    <main className="min-h-screen gradient-bg">
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-12">
        {!info && isLoadingPosts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !info ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Blog Not Found</h1>
            <p className="text-muted-foreground">
              This blog address doesn&apos;t exist or isn&apos;t deployed on this chain.
            </p>
          </div>
        ) : (
          <>
            <BlogHeader info={info} />

            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <PostList posts={paginatedPosts} blogAddress={address} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

