import React from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function ChannelCommunityTab({
  isOwner,
  posts,
  newPost,
  setNewPost,
  createPost,
}: {
  isOwner: boolean;
  posts: any[];
  newPost: string;
  setNewPost: (val: string) => void;
  createPost: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-xl font-semibold">Community</h2>

      {isOwner ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share an update…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={createPost} className="bg-red-600 hover:bg-red-700">
              Post
            </Button>
          </div>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post: any) => (
            <div key={post._id} className="rounded-lg border bg-background p-4">
              <div className="text-sm whitespace-pre-wrap">{post.text}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
