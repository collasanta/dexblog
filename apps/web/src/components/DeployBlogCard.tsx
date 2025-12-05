"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChainSelector } from "./ChainSelector";
import { useBlogFactory } from "@/hooks/useBlogFactory";
import { Rocket, Loader2, CheckCircle, ExternalLink, Coins, Info } from "lucide-react";
import { formatEther, formatUnits, truncateAddress } from "@/lib/utils";
import { USDC_DECIMALS } from "@/lib/contracts";
import { getChainById } from "@/lib/chains";
import Link from "next/link";

export function DeployBlogCard() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [blogName, setBlogName] = useState("");
  const [deploymentResult, setDeploymentResult] = useState<{ blogAddress: string; txHash: string } | null>(null);

  const {
    setupFee,
    usdcAddress,
    factoryAddress,
    usdcBalance,
    hasEnoughBalance,
    isFactoryOwner,
    createBlog,
    isCreating,
    isApproving,
    isLoadingFee,
    needsApproval,
  } = useBlogFactory();

  const handleDeploy = async () => {
    if (!blogName.trim()) return;

    try {
      // createBlog already handles approve automatically
      const result = await createBlog(blogName);
      if (result) {
        setDeploymentResult(result);
        setBlogName("");
      }
    } catch (error) {
      console.error("Failed to create blog:", error);
      // Show error to user
      alert(error instanceof Error ? error.message : "Failed to create blog. Please try again.");
    }
  };

  if (deploymentResult) {
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
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 text-center">Blog Address</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-sm break-all text-center">{truncateAddress(deploymentResult.blogAddress, 8)}</p>
                <a
                  href={`${getChainById(chainId)?.blockExplorers?.default.url}/address/${deploymentResult.blogAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 text-center">Transaction Hash</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-sm break-all text-center">{truncateAddress(deploymentResult.txHash, 8)}</p>
                <a
                  href={`${getChainById(chainId)?.blockExplorers?.default.url}/tx/${deploymentResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link href={`/blog/${deploymentResult.blogAddress}`}>
              <Button className="w-full gap-2">
                <Rocket className="h-4 w-4" />
                Publish Your First Post
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setDeploymentResult(null)}
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
          <h2 className="text-2xl font-bold mb-2">Deploy Your Blog Contract</h2>
          {setupFee !== undefined && setupFee > 0n ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-muted-foreground text-sm">
                One-time fee:{" "}
                <span className="font-mono text-primary font-semibold">
                  {isLoadingFee
                    ? "..."
                    : `${formatUnits(setupFee, USDC_DECIMALS[chainId] || 6)} USDC`}
                </span>
              </p>
              <div className="group relative">
                <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-2 bg-muted border border-border rounded-lg text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                 Or deploy for free by yourself, our protocol is open source and contract is available on github.
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              This will create your own blog contract.
            </p>
          )}
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
              disabled={!isConnected || isCreating || isApproving}
            />
          </div>


          {setupFee !== undefined && setupFee > 0n && (
            <>
              {!isFactoryOwner && !hasEnoughBalance && usdcBalance !== undefined && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
                  ⚠️ Insufficient USDC balance. You need {formatUnits(setupFee, USDC_DECIMALS[chainId] || 6)} USDC but only have {formatUnits(usdcBalance, USDC_DECIMALS[chainId] || 6)} USDC
                </div>
              )}
              {!isFactoryOwner && hasEnoughBalance && needsApproval && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-500">
                  ℹ️ You'll need to approve USDC spending first (this happens automatically when you click Deploy)
                </div>
              )}
            </>
          )}
        </div>

        <Button
          onClick={handleDeploy}
          disabled={
            !isConnected ||
            !blogName.trim() ||
            isCreating ||
            isApproving ||
            (!isFactoryOwner && (!usdcAddress || !factoryAddress)) ||
            (!isFactoryOwner && !hasEnoughBalance && setupFee !== undefined && setupFee > 0n)
          }
          className="w-full gap-2"
          size="lg"
        >
          {!isConnected ? (
            "Connect Wallet to Deploy"
          ) : isApproving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Approving USDC...
            </>
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
        
        {isConnected && !factoryAddress && (
          <p className="text-center text-xs text-yellow-500">
            ⚠️ Factory contract not deployed on this chain yet
          </p>
        )}
      </div>
    </GlassCard>
  );
}

