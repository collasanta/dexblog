"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserBlogs } from "@/hooks/useUserBlogs";
import { useAccount } from "wagmi";
import {
  Loader2,
  PenLine,
  Plus,
  ExternalLink,
  FileText,
  Wallet,
} from "lucide-react";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { blogs, isLoading, blogCount } = useUserBlogs();

  return (
    <main className="min-h-screen gradient-bg">
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Blogs</h1>
            <p className="text-muted-foreground">
              Manage your decentralized blogs
            </p>
          </div>
          <Link href="/">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Blog
            </Button>
          </Link>
        </div>

        {!isConnected ? (
          <GlassCard className="p-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your blogs
            </p>
          </GlassCard>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : blogs.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <PenLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Blogs Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven&apos;t created any blogs on this chain yet.
            </p>
            <Link href="/">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Blog
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <GlassCard
                key={blog.address}
                className="p-6 hover:shadow-glow-sm hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-2">{blog.name}</h3>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <FileText className="h-4 w-4" />
                  {blog.postCount} posts
                </div>

                <p className="text-xs text-muted-foreground font-mono mb-4 truncate">
                  {blog.address}
                </p>

                <div className="flex gap-2">
                  <Link href={`/blog/${blog.address}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/blog/${blog.address}/new`} className="flex-1">
                    <Button className="w-full gap-2" size="sm">
                      <Plus className="h-4 w-4" />
                      New Post
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


