"use client";

import dynamic from "next/dynamic";
import { FeatureCard } from "@/components/FeatureCard";
import { Database, Shield, Globe, Zap, Code, Infinity as InfinityIcon, Github } from "lucide-react";
import { TypeAnimation } from "react-type-animation";

const Header = dynamic(() => import("@/components/Header").then(mod => ({ default: mod.Header })), { ssr: false });
const DeployBlogCard = dynamic(() => import("@/components/DeployBlogCard").then(mod => ({ default: mod.DeployBlogCard })), { ssr: false });
const SDKPreview = dynamic(() => import("@/components/SDKPreview").then(mod => ({ default: mod.SDKPreview })), { ssr: false });

export default function Home() {
  return (
    <main className="min-h-screen gradient-bg overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 max-w-full">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <a
              href="https://github.com/collasanta/dexblog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-primary mb-6 hover:bg-white/10 transition-colors group"
            >
              <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
              OpenSource Decentralized Blog Protocol
            </a>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
              <TypeAnimation
                sequence={[
                  "Your Words",
                  1000,
                  "On-Chain",
                  1000,
                  "Forever",
                  2000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
                cursor={true}
                style={{ display: "inline-block" }}
              />
            </h1>
          </div>

          {/* Deploy Card */}
          <div className="flex justify-center mb-20">
            <DeployBlogCard />
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={InfinityIcon}
              title="Forever Accessible"
              description="As long as the blockchain exists, your content remains accessible. No takedowns, no deletions."
            />
            <FeatureCard
              icon={Database}
              title="On-Chain Storage"
              description="Posts are stored inside your unique blockchain contract. No databases, no servers - just pure decentralization."
            />
            <FeatureCard
              icon={Shield}
              title="True Ownership"
              description="Your wallet owns your blog contract. Only you can create and modify your blog's content."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Publishing"
              description="Publish posts with a single transaction. Content is immediately available worldwide."
            />
            <FeatureCard
              icon={Globe}
              title="Multi-Chain"
              description="Deploy on Base, Arbitrum, Optimism, or BNB Chain. Choose your preferred chain."
            />
            <FeatureCard
              icon={Code}
              title="Open Source SDK"
              description="Build your own frontend, integrate with existing apps, and use our SDK to read and manage your blog."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Connect & Deploy</h3>
              <p className="text-muted-foreground text-sm">
                Connect your wallet, choose a chain, and deploy your blog
                contract in one click.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Write & Publish</h3>
              <p className="text-muted-foreground text-sm">
                Write your posts in Markdown. Each publish creates an on-chain
                record with your content.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Share Forever</h3>
              <p className="text-muted-foreground text-sm">
                Share your blog URL. Anyone can read your posts directly from
                the blockchain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SDK Preview */}
      <SDKPreview />

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 DexBlog. Open source and decentralized.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/collasanta/dexblog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://npmjs.com/package/dex-blog-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              SDK
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

