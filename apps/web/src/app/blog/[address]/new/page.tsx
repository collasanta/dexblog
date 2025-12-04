"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { PublishPostForm } from "@/components/PublishPostForm";
import { useBlog } from "@/hooks/useBlog";
import { useAccount } from "wagmi";
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react";

interface NewPostPageProps {
  params: { address: string };
}

export default function NewPostPage({ params }: NewPostPageProps) {
  const { address } = params;
  const blogAddress = address as `0x${string}`;
  const { info, isLoadingPosts } = useBlog(blogAddress);
  const { address: userAddress, isConnected } = useAccount();

  const isOwner =
    isConnected &&
    userAddress &&
    info?.owner.toLowerCase() === userAddress.toLowerCase();

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

        {isLoadingPosts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !info ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Blog Not Found</h1>
            <p className="text-muted-foreground">
              This blog address doesn&apos;t exist.
            </p>
          </div>
        ) : !isConnected ? (
          <div className="text-center py-20">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Connect Wallet</h1>
            <p className="text-muted-foreground">
              Please connect your wallet to publish posts.
            </p>
          </div>
        ) : !isOwner ? (
          <div className="text-center py-20">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              Only the blog owner can publish posts.
            </p>
          </div>
        ) : (
          <PublishPostForm blogAddress={blogAddress} />
        )}
      </div>
    </main>
  );
}

