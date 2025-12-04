"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BlogInfo } from "@/hooks/useBlog";
import { truncateAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import { PenLine, Plus, ExternalLink } from "lucide-react";

interface BlogHeaderProps {
  info: BlogInfo;
}

export function BlogHeader({ info }: BlogHeaderProps) {
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === info.owner.toLowerCase();

  return (
    <div className="border-b border-border pb-8 mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{info.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Owner:{" "}
              <span className="font-mono text-primary">
                {truncateAddress(info.owner)}
              </span>
            </span>
            <span>{info.postCount} posts</span>
          </div>
        </div>

        {isOwner && (
          <Link href={`/blog/${info.address}/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

