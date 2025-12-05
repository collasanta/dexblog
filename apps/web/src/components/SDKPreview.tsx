"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

const codeExamples = {
  "Create Blog": `import { getFactory } from "dex-blog-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Get factory instance
const factory = getFactory(42161, { signer });

// Create a new blog (returns the blog address)
const result = await factory.createBlogAsOwner("My Blog");

// Save the blog address for later use
const blogAddress = result.blogAddress;
console.log("Blog created:", blogAddress);`,

  "Get Blog": `import { getBlog } from "dex-blog-sdk";

// Use an existing blog address
// (from Create Blog step, URL, or database)
const blogAddress = "0x...";

// Get blog instance to interact with it
const blog = getBlog(blogAddress, 42161);

// Now you can use the blog instance
const info = await blog.getInfo();
const posts = await blog.getPosts();`,

  "Publish": `import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Get blog instance with signer for write operations
const blog = getBlog(
  "0x...", // Blog address
  42161,   // Chain ID
  { signer }
);

// Publish a new post
const result = await blog.publish(
  "My First Post",
  "# Hello World\\n\\nThis is my first post!"
);

console.log("Post ID:", result.postId);
console.log("Tx hash:", result.receipt.hash);`,

  "Edit Post": `import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const blog = getBlog("0x...", 42161, { signer });

// Edit an existing post
const receipt = await blog.editPost(
  0,                    // Post ID
  "Updated Title",      // New title
  "Updated content"     // New body
);

console.log("Tx hash:", receipt.hash);`,

  "Delete Post": `import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const blog = getBlog("0x...", 42161, { signer });

// Delete a post (soft delete)
const receipt = await blog.deletePost(0);

console.log("Delete tx hash:", receipt.hash);

// Note: Deleted posts are excluded by default
// To include them, use:
const allPosts = await blog.getPosts({ 
  includeDeleted: true 
});`,

  "Get Posts": `import { getBlog } from "dex-blog-sdk";

// Get blog instance
const blog = getBlog("0x...", 42161);

// Get all posts
const posts = await blog.getPosts();

// Get posts without hashes (faster)
const posts = await blog.getPosts({ 
  withHashes: false 
});

// Get posts with pagination
const posts = await blog.getPosts({
  offset: 0,
  limit: 10
});`,

  "Get Info": `import { getBlog } from "dex-blog-sdk";

// Get blog instance (read-only, no signer needed)
const blog = getBlog("0x...", 42161);

// Get blog information
const info = await blog.getInfo();

console.log(info.name);      // Blog name
console.log(info.owner);     // Owner address
console.log(info.postCount); // Number of posts`,
};

const tabs = Object.keys(codeExamples);

export function SDKPreview() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeExamples[activeTab as keyof typeof codeExamples]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 px-0 md:px-4">
      <div className="container mx-auto max-w-6xl px-0 md:px-4">
        <div className="text-center mb-12 px-4 md:px-0">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Building with the SDK
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Integrate DexBlog into your application with just a few lines of code.
          </p>
        </div>

        <div className="bg-muted/50 rounded-none md:rounded-lg border-x-0 md:border border-border overflow-hidden">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 p-2 md:p-4 border-b border-border bg-muted/30">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Code Block */}
          <div className="relative">
            <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/50"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500/50"></div>
                <div className="h-3 w-3 rounded-full bg-green-500/50"></div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="gap-2 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy code
                  </>
                )}
              </Button>
            </div>

            <div className="overflow-x-auto bg-[#0d1117] m-0">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children }) => <pre className="m-0 p-4 md:p-6 bg-transparent">{children}</pre>,
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    return match ? (
                      <code className={`${className} text-sm md:text-base leading-relaxed block`} {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-sm font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {`\`\`\`typescript\n${codeExamples[activeTab as keyof typeof codeExamples]}\n\`\`\``}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a
            href="https://npmjs.com/package/dex-blog-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            View on npm
          </a>
        </div>
      </div>
    </section>
  );
}

