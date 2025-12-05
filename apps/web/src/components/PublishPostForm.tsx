"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBlog } from "@/hooks/useBlog";
import { Loader2, Eye, Edit3, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

interface PublishPostFormProps {
  blogAddress: `0x${string}`;
}

export function PublishPostForm({ blogAddress }: PublishPostFormProps) {
  const router = useRouter();
  const { publish, isPublishing } = useBlog(blogAddress);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) return;

    const result = await publish(title, body);
    if (result.success) {
      // Optionally redirect to the new post
      if (result.postId !== undefined) {
        router.push(`/blog/${blogAddress}/post/${result.postId}`);
      } else {
        router.push(`/blog/${blogAddress}`);
      }
    }
  };

  const titleBytes = new TextEncoder().encode(title).length;
  const bodyBytes = new TextEncoder().encode(body).length;
  const isTitleValid = titleBytes <= 500;
  const isBodyValid = bodyBytes <= 50000 && bodyBytes > 0;

  return (
    <form onSubmit={handleSubmit}>
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">New Post</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? (
              <>
                <Edit3 className="h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview
              </>
            )}
          </Button>
        </div>

        {showPreview ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">{title || "Untitled"}</h1>
            </div>
            <div className="prose-dark prose prose-lg max-w-none min-h-[300px]">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {body || "*No content yet*"}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title</Label>
                <span
                  className={`text-xs ${
                    isTitleValid ? "text-muted-foreground" : "text-destructive"
                  }`}
                >
                  {titleBytes}/500 bytes
                </span>
              </div>
              <Input
                id="title"
                placeholder="Enter your post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPublishing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Content (Markdown supported)</Label>
                <span
                  className={`text-xs ${
                    isBodyValid ? "text-muted-foreground" : "text-destructive"
                  }`}
                >
                  {bodyBytes}/50000 bytes
                </span>
              </div>
              <Textarea
                id="body"
                placeholder="Write your post content here. Markdown is supported..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isPublishing}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>
        )}
      </GlassCard>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Posts are stored on-chain. You can edit or delete them later if you&apos;re the blog owner.
        </p>
        <Button
          type="submit"
          disabled={
            isPublishing || !title.trim() || !body.trim() || !isTitleValid || !isBodyValid
          }
          className="gap-2"
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish Post
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

