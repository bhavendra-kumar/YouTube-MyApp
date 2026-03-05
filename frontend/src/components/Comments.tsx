import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/context/AuthContext";
import axiosClient from "@/services/http/axios";
import { getSocket } from "@/lib/socket";
import { notify } from "@/services/toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city?: string;
  originalLanguage?: string;
  likes?: string[];
  dislikes?: string[];
  isDeleted?: boolean;
}

type ReactionResponse = {
  _id: string;
  videoid: string;
  likesCount: number;
  dislikesCount: number;
  isDeleted: boolean;
};

type TranslationState = {
  original: string;
  translated: string;
  showing: "translated" | "original";
};

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  const [targetLang, setTargetLang] = useState("en");
  const [reactionPendingById, setReactionPendingById] = useState<Record<string, boolean>>({});
  const [translatePendingById, setTranslatePendingById] = useState<Record<string, boolean>>({});
  const [translationById, setTranslationById] = useState<Record<string, TranslationState>>({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  const prevVideoId = useRef<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;

    const socket = getSocket();
    socket.connect();
    socket.emit("video:join", videoId);

    const onNew = (incoming: Comment) => {
      if (!incoming || String(incoming.videoid) !== String(videoId)) return;
      if (page !== 1) return;
      setComments((prev) =>
        prev.some((c) => c._id === incoming._id) ? prev : [incoming, ...prev]
      );
    };

    const onUpdated = (incoming: Comment) => {
      if (!incoming || String(incoming.videoid) !== String(videoId)) return;
      setComments((prev) =>
        prev.map((c) => (c._id === incoming._id ? { ...c, ...incoming } : c))
      );
    };

    const onDeleted = (payload: { _id: string; videoid: string }) => {
      if (!payload || String(payload.videoid) !== String(videoId)) return;
      setComments((prev) => prev.filter((c) => c._id !== payload._id));
    };

    socket.on("comment:new", onNew);
    socket.on("comment:updated", onUpdated);
    socket.on("comment:deleted", onDeleted);

    return () => {
      socket.emit("video:leave", videoId);
      socket.off("comment:new", onNew);
      socket.off("comment:updated", onUpdated);
      socket.off("comment:deleted", onDeleted);
    };
  }, [page, videoId]);

  const loadComments = async () => {
    if (!videoId) {
      setComments([]);
      setTotalPages(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosClient.get(`/comment/${videoId}`, {
        params: {
          page,
          limit,
        },
      });

      const items = res.data?.items;
      const next = Array.isArray(items) ? items : [];
      // Extra safety: never render soft-deleted comments.
      setComments(next.filter((c: Comment) => !c?.isDeleted));

      const nextTotalPages = Number(res.data?.totalPages ?? 0);
      const nextCurrentPage = Number(res.data?.currentPage ?? page);
      setTotalPages(Number.isFinite(nextTotalPages) ? nextTotalPages : 0);
      prevVideoId.current = String(videoId);

      if (Number.isFinite(nextCurrentPage) && nextCurrentPage > 0 && nextCurrentPage !== page) {
        setPage(nextCurrentPage);
      }
    } catch (error) {
      console.log(error);
      setComments([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If video changed, wait for page reset to 1 before fetching.
    if (prevVideoId.current && prevVideoId.current !== String(videoId) && page !== 1) return;
    loadComments();
  }, [page, videoId]);

  const pageLabel = !totalPages || totalPages <= 1 ? "" : `Page ${page} of ${totalPages}`;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      _id: tempId,
      videoid: String(videoId),
      userid: String(user._id),
      commentbody: newComment,
      usercommented: String(user.name || "You"),
      commentedon: new Date().toISOString(),
      city: "Unknown",
      originalLanguage: "unknown",
      likes: [],
      dislikes: [],
      isDeleted: false,
    };

    const previousText = newComment;
    setNewComment("");

    if (page === 1) {
      setComments((prev) => [optimistic, ...prev]);
    } else {
      setPage(1);
    }

    try {
      const res = await axiosClient.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: previousText,
        usercommented: user.name,
      });

      const created: Comment | null = (res.data?.data && res.data.data._id) ? res.data.data : null;
      if (created) {
        setComments((prev) => prev.map((c) => (c._id === tempId ? created : c)));
      } else {
        // If backend doesn't return the created comment, re-fetch on next page load.
        setComments((prev) => prev.filter((c) => c._id !== tempId));
        notify.success("Comment posted");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      setComments((prev) => prev.filter((c) => c._id !== tempId));
      setNewComment(previousText);
      notify.error("Could not post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const withOptimisticReaction = (comment: Comment, next: "like" | "dislike") => {
    const userId = user?._id;
    if (!userId) return comment;

    const likes = Array.isArray(comment.likes) ? comment.likes : [];
    const dislikes = Array.isArray(comment.dislikes) ? comment.dislikes : [];

    if (next === "like") {
      const nextLikes = likes.includes(userId) ? likes : [userId, ...likes];
      const nextDislikes = dislikes.filter((id) => String(id) !== String(userId));
      return { ...comment, likes: nextLikes, dislikes: nextDislikes };
    }

    const nextDislikes = dislikes.includes(userId) ? dislikes : [userId, ...dislikes];
    const nextLikes = likes.filter((id) => String(id) !== String(userId));
    return { ...comment, likes: nextLikes, dislikes: nextDislikes };
  };

  const handleLike = async (comment: Comment) => {
    if (!user?._id) {
      notify.info("Please sign in to like comments");
      return;
    }
    if (reactionPendingById[comment._id]) return;
    if ((comment.likes || []).includes(user._id)) return;

    const prev = comment;
    setReactionPendingById((m) => ({ ...m, [comment._id]: true }));
    setComments((list) =>
      list.map((c) => (c._id === comment._id ? withOptimisticReaction(c, "like") : c))
    );

    try {
      const res = await axiosClient.post(`/comment/${comment._id}/like`);
      const data = res.data as ReactionResponse;

      if (data?.isDeleted) {
        setComments((list) => list.filter((c) => c._id !== comment._id));
      }
    } catch (error) {
      setComments((list) => list.map((c) => (c._id === comment._id ? prev : c)));
      notify.error("Could not like comment");
    } finally {
      setReactionPendingById((m) => ({ ...m, [comment._id]: false }));
    }
  };

  const handleDislike = async (comment: Comment) => {
    if (!user?._id) {
      notify.info("Please sign in to dislike comments");
      return;
    }
    if (reactionPendingById[comment._id]) return;
    if ((comment.dislikes || []).includes(user._id)) return;

    const prev = comment;
    setReactionPendingById((m) => ({ ...m, [comment._id]: true }));
    setComments((list) =>
      list.map((c) => (c._id === comment._id ? withOptimisticReaction(c, "dislike") : c))
    );

    try {
      const res = await axiosClient.post(`/comment/${comment._id}/dislike`);
      const data = res.data as ReactionResponse;

      if (data?.isDeleted) {
        setComments((list) => list.filter((c) => c._id !== comment._id));
      }
    } catch (error) {
      setComments((list) => list.map((c) => (c._id === comment._id ? prev : c)));
      notify.error("Could not dislike comment");
    } finally {
      setReactionPendingById((m) => ({ ...m, [comment._id]: false }));
    }
  };

  const handleTranslate = async (comment: Comment) => {
    if (translatePendingById[comment._id]) return;

    const existing = translationById[comment._id];
    if (existing) {
      setTranslationById((m) => ({
        ...m,
        [comment._id]: {
          ...existing,
          showing: existing.showing === "translated" ? "original" : "translated",
        },
      }));
      return;
    }

    setTranslatePendingById((m) => ({ ...m, [comment._id]: true }));
    try {
      const res = await axiosClient.post("/comment/translate", {
        text: comment.commentbody,
        targetLang,
      });

      const translated = res.data?.translated;
      if (typeof translated !== "string" || !translated.trim()) {
        throw new Error("invalid translation");
      }

      setTranslationById((m) => ({
        ...m,
        [comment._id]: {
          original: comment.commentbody,
          translated,
          showing: "translated",
        },
      }));
    } catch (error) {
      notify.error("Could not translate comment");
    } finally {
      setTranslatePendingById((m) => ({ ...m, [comment._id]: false }));
    }
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosClient.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
      notify.error("Could not update comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosClient.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
      notify.error("Could not delete comment");
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Comments</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="comment-target-lang">
            Translate to
          </label>
          <select
            id="comment-target-lang"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="hi">Hindi</option>
            <option value="ar">Arabic</option>
          </select>
          {pageLabel && <span className="text-sm text-muted-foreground">{pageLabel}</span>}
        </div>
      </div>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments
            .filter((c) => !c?.isDeleted)
            .map((comment) => {
              const likesCount = Array.isArray(comment.likes) ? comment.likes.length : 0;
              const dislikesCount = Array.isArray(comment.dislikes) ? comment.dislikes.length : 0;
              const pendingReaction = Boolean(reactionPendingById[comment._id]);
              const pendingTranslate = Boolean(translatePendingById[comment._id]);
              const translation = translationById[comment._id];
              const displayedText =
                translation?.showing === "translated" ? translation.translated : comment.commentbody;

              return (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{displayedText}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {comment.city || "Unknown"}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLike(comment)}
                        disabled={pendingReaction}
                      >
                        👍 Like {likesCount}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDislike(comment)}
                        disabled={pendingReaction}
                      >
                        👎 Dislike {dislikesCount}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTranslate(comment)}
                        disabled={pendingTranslate}
                      >
                        🌍 {translation ? (translation.showing === "translated" ? "Show Original" : "Show Translation") : "Translate"}
                      </Button>
                    </div>

                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-sm text-gray-500">
                        <button onClick={() => handleEdit(comment)}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(comment._id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
              );
            })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Comments;