"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChainSelector } from "./ChainSelector";
import { useBlogFactory } from "@/hooks/useBlogFactory";
import { Rocket, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { formatEther } from "@/lib/utils";
import Link from "next/link";

export function DeployBlogCard() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [blogName, setBlogName] = useState("");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const { setupFee, createBlog, isCreating, isLoadingFee } = useBlogFactory();

  const handleDeploy = async () => {
    if (!blogName.trim()) return;

    try {
      const result = await createBlog(blogName);
      if (result) {
        setDeployedAddress(result);
        setBlogName("");
      }
    } catch (error) {
      console.error("Failed to create blog:", error);
    }
  };

  if (deployedAddress) {
    return (
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Blog Deployed!</h3>
            <p className="text-muted-foreground text-sm">
              Your decentralized blog is now live on-chain
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
            <p className="font-mono text-sm break-all">{deployedAddress}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={`/blog/${deployedAddress}`}>
              <Button className="w-full gap-2">
                View Your Blog
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setDeployedAddress(null)}
              className="w-full"
            >
              Deploy Another
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-md p-8">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Deploy Your Blog</h2>
          <p className="text-muted-foreground text-sm">
            Create your own decentralized blog on any chain
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chain">Select Chain</Label>
            <ChainSelector />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blogName">Blog Name</Label>
            <Input
              id="blogName"
              placeholder="My Awesome Blog"
              value={blogName}
              onChange={(e) => setBlogName(e.target.value)}
              disabled={!isConnected || isCreating}
            />
          </div>

          {setupFee !== undefined && setupFee > 0n && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Setup Fee</span>
              <span className="font-mono text-primary">
                {isLoadingFee ? "..." : `${formatEther(setupFee)} ETH`}
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={handleDeploy}
          disabled={!isConnected || !blogName.trim() || isCreating}
          className="w-full gap-2"
          size="lg"
        >
          {!isConnected ? (
            "Connect Wallet to Deploy"
          ) : isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Deploy Blog
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-center text-xs text-muted-foreground">
            Connect your wallet to deploy a blog
          </p>
        )}
      </div>
    </GlassCard>
  );
}

