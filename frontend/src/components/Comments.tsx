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
}
const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

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
      setComments(Array.isArray(items) ? items : []);

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
        {pageLabel && <span className="text-sm text-muted-foreground">{pageLabel}</span>}
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
          comments.map((comment) => (
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
                    <p className="text-sm">{comment.commentbody}</p>
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
          ))
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