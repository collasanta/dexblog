"use client";

import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { PenLine } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border w-full overflow-x-hidden">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <PenLine className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-xl">
            Dex<span className="text-primary">Blog</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            My Blogs
          </Link>
          <a
            href="https://github.com/collasanta/dexblog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            GitHub
          </a>
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}

