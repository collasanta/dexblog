"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BlogInfo } from "@/hooks/useBlog";
import { truncateAddress } from "@/lib/utils";
import { useAccount, useChainId } from "wagmi";
import { PenLine, Plus, ExternalLink } from "lucide-react";
import { getChainById } from "@/lib/chains";

interface BlogHeaderProps {
  info: BlogInfo;
}

export function BlogHeader({ info }: BlogHeaderProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isOwner = address?.toLowerCase() === info.owner.toLowerCase();
  const explorerUrl = getChainById(chainId)?.blockExplorers?.default.url;

  return (
    <div className="border-b border-border pb-8 mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{info.name}</h1>
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">
              Contract:{" "}
              {explorerUrl ? (
                <a
                  href={`${explorerUrl}/address/${info.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  {truncateAddress(info.address)}
                  <ExternalLink className="h-3 w-3 inline-block" />
                </a>
              ) : (
                <span className="font-mono text-primary">
                  {truncateAddress(info.address)}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Owner:{" "}
              {explorerUrl ? (
                <a
                  href={`${explorerUrl}/address/${info.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  {truncateAddress(info.owner)}
                </a>
              ) : (
                <>
                <div>
                  <span className="font-mono text-primary">
                    {truncateAddress(info.owner)}
                  </span>
                </div>                </>
              )}

            </span>
          </div>
        </div>
          
          <div className="flex flex-col space-y-4">
        {isOwner && (

          <Link href={`/blog/${info.address}/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </Link>
        )}
                    <span className="max-w-[100px] text-end pt-2">{info.postCount} posts</span>

          </div>
      </div>
    </div>
  );
}

